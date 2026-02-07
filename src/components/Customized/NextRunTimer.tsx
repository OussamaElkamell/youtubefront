import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

const NextRunTimer = ({ schedule }: { schedule: any }) => {
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (!schedule.nextRunAt || schedule.status !== 'active') {
            setTimeLeft(0);
            return;
        }

        const nextRunTime = new Date(schedule.nextRunAt).getTime();

        let interval: NodeJS.Timeout;
        const updateTimer = () => {
            const now = Date.now();
            const remaining = Math.max(0, nextRunTime - now);
            setTimeLeft(remaining);

            if (remaining <= 0 && interval) {
                clearInterval(interval);
            }
        };

        updateTimer();
        interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [schedule.nextRunAt, schedule.status]);

    if (!schedule.nextRunAt || schedule.status !== 'active' || timeLeft <= 0) return null;

    const hours = Math.floor(timeLeft / 3600000);
    const minutes = Math.floor((timeLeft % 3600000) / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000).toString().padStart(2, '0');

    return (
        <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 font-medium">
            <Timer className="h-3.5 w-3.5 animate-pulse" />
            <span>Next run in: {hours > 0 ? `${hours}:` : ''}{minutes}:{seconds}</span>
        </div>
    );
};

export default NextRunTimer;
