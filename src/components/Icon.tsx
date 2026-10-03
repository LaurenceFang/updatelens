import type { CSSProperties } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { FolderIcon } from "@phosphor-icons/react/dist/csr/Folder";
import { FileTextIcon } from "@phosphor-icons/react/dist/csr/FileText";
import { PushPinIcon } from "@phosphor-icons/react/dist/csr/PushPin";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { InfoIcon } from "@phosphor-icons/react/dist/csr/Info";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/csr/DownloadSimple";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { DesktopIcon } from "@phosphor-icons/react/dist/csr/Desktop";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { NotePencilIcon } from "@phosphor-icons/react/dist/csr/NotePencil";
import { WindowsLogoIcon } from "@phosphor-icons/react/dist/csr/WindowsLogo";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/csr/SlidersHorizontal";
import { CircleIcon } from "@phosphor-icons/react/dist/csr/Circle";
const icons = {
  arrow: ArrowRightIcon,
  previous: ArrowLeftIcon,
  chevron: CaretRightIcon,
  down: CaretDownIcon,
  check: CheckIcon,
  folder: FolderIcon,
  file: FileTextIcon,
  pin: PushPinIcon,
  external: ArrowSquareOutIcon,
  info: InfoIcon,
  close: XIcon,
  download: DownloadSimpleIcon,
  search: MagnifyingGlassIcon,
  monitor: DesktopIcon,
  refresh: ArrowClockwiseIcon,
  edit: NotePencilIcon,
  windows: WindowsLogoIcon,
  sliders: SlidersHorizontalIcon,
  circle: CircleIcon,
};
export default function Icon({
  name,
  size = 18,
  style,
  weight = "regular",
}: {
  name: keyof typeof icons;
  size?: number;
  style?: CSSProperties;
  weight?: "regular" | "fill";
}) {
  const Component = icons[name];
  return (
    <Component
      className="icon"
      size={size}
      weight={weight}
      aria-hidden="true"
      style={style}
    />
  );
}
