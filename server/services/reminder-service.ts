import { storage } from "../storage";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { Trial } from "@shared/schema";

class ReminderService {
  async scheduleObservationReminder(trial: Trial): Promise<void> {
    try {
      await storage.createNotification({
        userId: trial.userId,
        babyId: trial.babyId,
        trialId: trial.id,
        type: "observation_complete",
        title: "Observation Period Complete",
        message: `The observation period for the food trial has ended. Please confirm if there were any reactions.`,
        scheduledFor: trial.observationEndsAt,
      });
    } catch (error) {
      console.error("Error scheduling reminder:", error);
    }
  }

  async processReminders(): Promise<void> {
    try {
      // This would typically be more complex with actual email/push notification services
      // For now, we just mark scheduled notifications as sent
      console.log("Processing scheduled reminders...");
      
      // In a real implementation, you would:
      // 1. Query for notifications that are due to be sent
      // 2. Send email/push notifications using services like Resend, Firebase, etc.
      // 3. Mark notifications as sent
      
      // Example implementation would query notifications where:
      // - scheduledFor <= now
      // - sentAt is null
      // Then send the actual notifications and update sentAt
    } catch (error) {
      console.error("Error processing reminders:", error);
    }
  }
}

export const reminderService = new ReminderService();
