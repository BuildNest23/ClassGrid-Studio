import React from 'react';
import { useClassroom } from '../context/ClassroomContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useClassroom();

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 md:bottom-6 md:right-6 md:left-auto md:translate-x-0 z-[9998] flex flex-col gap-2 pointer-events-none items-center md:items-end">
      {toasts.map(t => {
        let bg = "bg-[#232019] text-[#F6F4EF]";
        if (t.type === 'success') bg = "bg-[#991B1B] text-white"; // Academic crimson success / primary
        else if (t.type === 'error') bg = "bg-[#DC2626] text-white";
        else if (t.type === 'info') bg = "bg-[#B45309] text-white";

        return (
          <div
            key={t.id}
            onClick={() => dismissToast(t.id)}
            className={`${bg} px-4 py-2.5 rounded-lg text-[13px] font-bold shadow-lg pointer-events-auto transition-all duration-200 cursor-pointer max-w-[calc(100vw-32px)] md:max-w-xs text-center md:text-left`}
          >
            {t.message}
          </div>
        );
      })}
    </div>
  );
};
