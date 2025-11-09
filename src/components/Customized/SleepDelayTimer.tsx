import { useEffect, useState } from 'react';

const SleepDelayTimer = ({ schedule }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!schedule.delays?.delayofsleep || !schedule.delays?.delayStartTime) {
      setTimeLeft(0);
      return;
    }

    const delayStartTime = new Date(schedule.delays.delayStartTime);
    const delayEndTime = new Date(delayStartTime.getTime() + schedule.delays.delayofsleep * 60 * 1000);
    
    const updateTimer = () => {
      const now = new Date();
      const remaining = Math.max(0, delayEndTime.getTime() - now.getTime());
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
      }
    };
    
    updateTimer(); // Initial update
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [schedule.delays?.delayofsleep, schedule.delays?.delayStartTime]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000).toString().padStart(2, '0');

  return (
    <span>
      Current sleep delay: {schedule.delays?.delayofsleep} minutes
      {typeof schedule.delays?.delayofsleep === 'number' && (
        <> | Real-time remaining: {minutes}:{seconds}</>
      )}
    </span>
  );
};

export default SleepDelayTimer;
