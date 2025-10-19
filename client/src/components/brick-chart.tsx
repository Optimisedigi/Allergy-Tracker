interface BrickChartProps {
  bricks: Array<{
    type: string;
    date: string;
  }>;
}

export default function BrickChart({ bricks }: BrickChartProps) {
  if (!bricks || bricks.length === 0) {
    return (
      <div className="flex flex-col min-h-[100px] justify-center items-center text-muted-foreground">
        <p className="text-xs">No trials yet</p>
      </div>
    );
  }

  const reversedBricks = [...bricks].reverse();

  return (
    <div className="brick-container min-h-[100px] flex flex-col" data-testid="brick-container">
      {reversedBricks.map((brick, index) => (
        <div
          key={index}
          className={`brick ${brick.type}`}
          title={`${brick.type} - ${new Date(brick.date).toLocaleDateString()}`}
          data-testid={`brick-${brick.type}-${index}`}
        />
      ))}
    </div>
  );
}
