import React, { useCallback } from 'react';
import { StudentCardModal } from './StudentCardModal';
import { buildFundStatementHTML, loadPrintStyle, loadPrintFooter, fundLinesForStudent } from '../utils/resultPrint';
import { AppData } from '../types';
import { PRINT_SIZES, fmtMoney } from '../utils/helpers';

interface Props {
  data: AppData;
  students: { id: string; name: string; rollNo: string }[];
  studentId: string;
  onChange: (studentId: string) => void;
  onClose: () => void;
}

/** Fee statement popup for one student (Funds tab). Uses the same A / B design as the result prints. */
export const FundCardModal: React.FC<Props> = ({ data, students, studentId, onChange, onClose }) => {
  const style = loadPrintStyle();
  const footerText = loadPrintFooter();
  const buildHTML = useCallback(
    (id: string) => buildFundStatementHTML({ style, data, footerText }, id),
    [style, data, footerText]
  );
  const notice = useCallback(
    (id: string) => {
      const owing = fundLinesForStudent(data, id).reduce((a, l) => a + (l.balance || 0), 0);
      return owing > 0 ? `Balance due: ${fmtMoney(owing)}` : '';
    },
    [data]
  );
  return (
    <StudentCardModal
      items={students}
      studentId={studentId}
      onChange={onChange}
      onClose={onClose}
      buildHTML={buildHTML}
      mult={(PRINT_SIZES[data.printSize] || PRINT_SIZES.m).mult}
      printSize={data.printSize}
      forceOrientation={data.forceOrientation}
      notice={notice}
      label="Fee Statement"
    />
  );
};
