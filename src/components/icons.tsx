import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/** A 16px outline icon on a 24px grid. Shapes from Lucide (ISC license). */
function icon(name: string, paths: React.ReactNode) {
  function Icon(props: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={16}
        height={16}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        {paths}
      </svg>
    );
  }
  Icon.displayName = name;
  return Icon;
}

export const PlusIcon = icon("PlusIcon", <path d="M5 12h14M12 5v14" />);
export const SearchIcon = icon("SearchIcon", <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>);
export const PanelLeftIcon = icon("PanelLeftIcon", <><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /></>);
export const ChevronDownIcon = icon("ChevronDownIcon", <path d="m6 9 6 6 6-6" />);
export const ChevronRightIcon = icon("ChevronRightIcon", <path d="m9 18 6-6-6-6" />);
export const ArrowLeftIcon = icon("ArrowLeftIcon", <path d="m12 19-7-7 7-7M19 12H5" />);
export const ArrowUpIcon = icon("ArrowUpIcon", <path d="m5 12 7-7 7 7M12 19V5" />);
export const CheckIcon = icon("CheckIcon", <path d="M20 6 9 17l-5-5" />);
export const XIcon = icon("XIcon", <path d="M18 6 6 18M6 6l12 12" />);
export const ListChecksIcon = icon("ListChecksIcon", <path d="m3 17 2 2 4-4M3 7l2 2 4-4M13 6h8M13 12h8M13 18h8" />);
export const EllipsisIcon = icon(
  "EllipsisIcon",
  <>
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </>,
);
export const PinIcon = icon(
  "PinIcon",
  <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />,
);
export const PinOffIcon = icon(
  "PinOffIcon",
  <path d="M12 17v5M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89M2 2l20 20M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11" />,
);
export const FolderIcon = icon(
  "FolderIcon",
  <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />,
);
export const FolderPlusIcon = icon(
  "FolderPlusIcon",
  <>
    <path d="M12 10v6M9 13h6" />
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  </>,
);
export const PencilIcon = icon(
  "PencilIcon",
  <>
    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    <path d="m15 5 4 4" />
  </>,
);
export const TrashIcon = icon(
  "TrashIcon",
  <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />,
);
export const SettingsIcon = icon(
  "SettingsIcon",
  <>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </>,
);
export const KeyIcon = icon(
  "KeyIcon",
  <>
    <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
    <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
  </>,
);
export const ShieldIcon = icon(
  "ShieldIcon",
  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />,
);
export const LogOutIcon = icon("LogOutIcon", <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />);
export const GraduationCapIcon = icon(
  "GraduationCapIcon",
  <>
    <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
    <path d="M22 10v6M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
  </>,
);
export const CodeIcon = icon("CodeIcon", <path d="m18 16 4-4-4-4M6 8l-4 4 4 4M14.5 4l-5 16" />);
export const CoffeeIcon = icon(
  "CoffeeIcon",
  <path d="M10 2v2M14 2v2M6 2v2M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" />,
);
export const LightbulbIcon = icon(
  "LightbulbIcon",
  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4" />,
);

/** A twelve-ray burst, drawn in the accent color beside the greeting. */
export function SparkIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true" {...props}>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        const r = i % 2 ? 8.5 : 11;
        // Rounded so the server and browser render identical attributes.
        const at = (d: number, f: (x: number) => number) => (12 + d * f(a)).toFixed(2);
        return <line key={i} x1={at(2.5, Math.cos)} y1={at(2.5, Math.sin)} x2={at(r, Math.cos)} y2={at(r, Math.sin)} />;
      })}
    </svg>
  );
}
