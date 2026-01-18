import { DashboardCard } from "./dashboard-card";

function getMonthMatrix(year: number, monthIndex0: number) {
  const first = new Date(year, monthIndex0, 1);
  const startDay = (first.getDay() + 6) % 7; // Mon=0..Sun=6
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();

  const cells: Array<{ day: number | null }> = [];
  for (let i = 0; i < startDay; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
  while (cells.length % 7 !== 0) cells.push({ day: null });
  return cells;
}

export function SchedulerCard({ date = new Date() }: { date?: Date }) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const today = date.getDate();

  const cells = getMonthMatrix(y, m);
  const weekdays = ["Mon", "Tues", "Wed", "Thur", "Fri", "Sat", "Sun"];

  return (
    <DashboardCard title="Scheduler">
      <div className="grid grid-cols-7 text-[10px] text-slate-400 mb-2">
        {weekdays.map((w) => (
          <div key={w} className="text-center">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-2 text-xs">
        {cells.map((c, idx) => {
          const isToday = c.day === today;
          return (
            <div key={idx} className="flex justify-center">
              {c.day ? (
                <div
                  className={[
                    "grid size-7 place-items-center rounded-full",
                    isToday
                      ? "bg-emerald-500 text-white"
                      : "text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {c.day}
                </div>
              ) : (
                <div className="size-7" />
              )}
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}
