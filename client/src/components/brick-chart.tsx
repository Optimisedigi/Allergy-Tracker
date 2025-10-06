interface BrickChartProps {
  bricks: Array<{
    type: string;
    date: string;
  }>;
}

export default function BrickChart({ bricks }: BrickChartProps) {
  if (!bricks || bricks.length === 0) {
    return (
      <div className="flex flex-col-reverse min-h-[100px] justify-center items-center text-muted-foreground">
        <p className="text-xs">No trials yet</p>
      </div>
    );
  }

  return (
    <div className="brick-container min-h-[100px] flex flex-col-reverse" data-testid="brick-container">
      {bricks.map((brick, index) => (
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
