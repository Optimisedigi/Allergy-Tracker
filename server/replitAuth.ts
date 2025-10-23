import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const CONFIGURED_DOMAINS = process.env.REPLIT_DOMAINS!.split(",");
const PRIMARY_DOMAIN = CONFIGURED_DOMAINS[0];

function resolveAuthHost(req: any): string {
  const forwardedHost = req.get('X-Forwarded-Host');
  
  if (forwardedHost) {
    const firstHost = forwardedHost.split(',')[0].trim();
    
    if (CONFIGURED_DOMAINS.includes(firstHost)) {
      console.log(`Using X-Forwarded-Host: ${firstHost}`);
      return firstHost;
    }
    
    console.warn(`X-Forwarded-Host "${firstHost}" not in REPLIT_DOMAINS, using primary domain`);
  }
  
  if (req.hostname && req.hostname !== 'localhost' && CONFIGURED_DOMAINS.includes(req.hostname)) {
    console.log(`Using req.hostname: ${req.hostname}`);
    return req.hostname;
  }
  
  console.log(`Falling back to PRIMARY_DOMAIN: ${PRIMARY_DOMAIN} (req.hostname was: ${req.hostname})`);
  return PRIMARY_DOMAIN;
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
  inviteBabyId?: string,
) {
  const userId = claims["sub"];
  const userEmail = claims["email"]?.toLowerCase();
  
  await storage.upsertUser({
    id: userId,
    email: userEmail,
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });

  // Auto-accept any pending invitations for this email
  if (userEmail) {
    try {
      const pendingInvitations = await storage.getPendingInvitationsByEmail(userEmail);
      
      for (const invitation of pendingInvitations) {
        try {
          await storage.acceptInvitation(invitation.id, userId);
          console.log(`Auto-accepted invitation ${invitation.id} for baby ${invitation.babyId}`);
        } catch (error) {
          console.error(`Failed to auto-accept invitation ${invitation.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to check for pending invitations:', error);
    }
  }

  // Handle invite link - add user to baby
  if (inviteBabyId) {
    try {
      // Check if user already has access to this baby
      const babies = await storage.getBabiesByUser(userId);
      const hasAccess = babies.some(b => b.id === inviteBabyId);
      
      if (!hasAccess) {
        await storage.addUserToBaby(userId, inviteBabyId, 'parent');
        console.log(`Added user ${userId} to baby ${inviteBabyId} via invite link`);
      }
    } catch (error) {
      console.error(`Failed to add user to baby via invite link:`, error);
    }
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback,
    req?: any
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    
    // Get invite baby ID from session if present
    const inviteBabyId = req?.session?.inviteBabyId;
    await upsertUser(tokens.claims(), inviteBabyId);
    
    // Clear invite from session after use
    if (inviteBabyId && req?.session) {
      delete req.session.inviteBabyId;
    }
    
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Store invite baby ID in session if present
    if (req.query.invite) {
      (req.session as any).inviteBabyId = req.query.invite;
    }
    
    const host = resolveAuthHost(req);
    passport.authenticate(`replitauth:${host}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const host = resolveAuthHost(req);
    passport.authenticate(`replitauth:${host}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    const host = resolveAuthHost(req);
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${host}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
