import React, { useCallback } from 'react';
import { StudentCardModal } from './StudentCardModal';
import { ResultPrintCtx, buildReportCardsHTML } from '../utils/resultPrint';
import { PRINT_SIZES } from '../utils/helpers';

interface Props {
  ctx: ResultPrintCtx;
  studentId: string;
  onChange: (studentId: string) => void;
  onClose: () => void;
}

/** Report card popup for one student (Results tab). */
export const ResultCardModal: React.FC<Props> = ({ ctx, studentId, onChange, onClose }) => {
  const buildHTML = useCallback((id: string) => buildReportCardsHTML(ctx, id), [ctx]);
  const notice = useCallback(
    (id: string) => {
      const res = (ctx.data.assessmentResults[ctx.asmt.id] || {})[id] || {};
      const missing = ctx.asmt.subjects.filter(sub => res[sub.id] === undefined).map(sub => sub.name);
      return missing.length ? `Marks not entered yet: ${missing.join(', ')}` : '';
    },
    [ctx]
  );
  return (
    <StudentCardModal
      items={ctx.ranked.map(i => ({ id: i.s.id, name: i.s.name, rollNo: i.s.rollNo }))}
      studentId={studentId}
      onChange={onChange}
      onClose={onClose}
      buildHTML={buildHTML}
      mult={(PRINT_SIZES[ctx.data.printSize] || PRINT_SIZES.m).mult}
      printSize={ctx.data.printSize}
      forceOrientation={ctx.data.forceOrientation}
      notice={notice}
      label="Result"
    />
  );
};
