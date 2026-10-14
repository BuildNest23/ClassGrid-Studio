import React from 'react';
import {
  WatermarkKind,
  WATERMARK_LIMITS,
  updateWatermark,
  useWatermark
} from '../utils/logoWatermark';

interface Props {
  /** Which paper these sliders belong to: a result card or a fee receipt */
  kind: WatermarkKind;
  /** Whether a school logo has been uploaded (the watermark needs one) */
  hasLogo: boolean;
  /** Extra classes for the outer box */
  className?: string;
}

/**
 * "Logo as watermark" switch with Size and Transparency sliders.
 * The switch is universal (the same on every screen). The sliders appear only while it is on.
 * Switching it off puts the logo back in the top-left corner of the paper.
 */
export const WatermarkOptions: React.FC<Props> = ({ kind, hasLogo, className = '' }) => {
  const wm = useWatermark();
  const look = wm[kind];
  const on = wm.enabled && hasLogo;
  const lim = WATERMARK_LIMITS;

  const setLook = (patch: { size?: number; opacity?: number }) =>
    updateWatermark(kind === 'result' ? { result: patch } : { receipt: patch });

  const slider = (
    id: string,
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (n: number) => void
  ) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
          {label}
        </label>
        <span className="text-[11px] font-bold text-stone-700 dark:text-stone-200 tabular-nums">{value}%</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#0b5d46] cursor-pointer"
      />
    </div>
  );

  return (
    <div
      className={`rounded-xl border p-2.5 transition-colors ${
        on
          ? 'border-[#0B5D45] bg-[#E8F3EC] dark:bg-[#0B5D45]/20 dark:border-[#2E9E73]'
          : 'border-[#E7E5E4] dark:border-[#44403C]'
      } ${className}`}
    >
      <label className={`flex items-start gap-2.5 select-none ${hasLogo ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}>
        <input
          type="checkbox"
          checked={on}
          disabled={!hasLogo}
          onChange={e => updateWatermark({ enabled: e.target.checked })}
          className="mt-0.5 w-4 h-4 accent-[#0B5D45] shrink-0"
        />
        <span className="flex flex-col leading-tight">
          <span className="text-[13px] font-bold text-[#1C1917] dark:text-[#F5F5F4]">Logo as watermark</span>
          <span className="text-[11px] text-[#78716C] dark:text-[#A8A29E] mt-0.5">
            {hasLogo
              ? 'Grey logo behind the paper instead of the top-left corner'
              : 'Upload a school logo in Settings to use this'}
          </span>
        </span>
      </label>
      {on && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
          {slider(`wm-size-${kind}`, 'Size', look.size, lim.size.min, lim.size.max, lim.size.step, n =>
            setLook({ size: n })
          )}
          {slider(
            `wm-opacity-${kind}`,
            'Visibility (lower = more transparent)',
            look.opacity,
            lim.opacity.min,
            lim.opacity.max,
            lim.opacity.step,
            n => setLook({ opacity: n })
          )}
        </div>
      )}
    </div>
  );
};
