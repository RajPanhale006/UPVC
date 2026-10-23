import type { TrackSystemId } from "@/lib/cutting/types";
import type {
  DoorConfiguration,
  DoorOpeningDirection,
  DoorOpeningSide,
} from "@/lib/cutting/door";

export type ProductType = "window" | "door";

export type PreviewMode = "detailed" | "compact" | "thumbnail" | "pdf";

export type PreviewViewFrom = "inside" | "outside";

export type PanelKind = "glass" | "net" | "mesh" | "fixed" | "solid";

export type ThreeTrackSashLayout = "two-glass-one-net" | "three-glass-no-net";

export type WindowPreviewConfiguration = {
  trackSystemId: TrackSystemId;
  sashLayout?: ThreeTrackSashLayout;
  panels?: PanelKind[];
  trackLabel?: string;
  sashConfigurationLabel?: string;
  profileFamily?: "T60" | "T109";
};

export type DoorPanelType = "glass" | "solid";

export type DoorPreviewConfiguration = {
  configuration: DoorConfiguration;
  openingSide: DoorOpeningSide;
  openingDirection: DoorOpeningDirection;
  panelType?: DoorPanelType;
  hasThreshold?: boolean;
  hasFixedSidePanel?: boolean;
  fixedSidePosition?: "left" | "right";
  showShootBolts?: boolean;
  showFlatMullion?: boolean;
  flatMullionMm?: number | null;
  activeLeaf?: "left" | "right";
};

export type ProductPreviewData = {
  productType: ProductType;
  widthMm: number;
  heightMm: number;
  quantity?: number;
  productCode?: string;
  profileCode?: string;
  viewFrom?: PreviewViewFrom;
  showDimensions?: boolean;
  showLabels?: boolean;
  showLegend?: boolean;
  window?: WindowPreviewConfiguration;
  door?: DoorPreviewConfiguration;
};

export type PreviewFrameVariant = "default" | "sidebar" | "bare";

export type PreviewSizing = {
  viewW: number;
  viewH: number;
  maxWidthPx: number;
};

export type ProductPreviewProps = {
  data: ProductPreviewData;
  mode?: PreviewMode;
  variant?: PreviewFrameVariant;
  className?: string;
  compact?: boolean;
  /** Render SVG only — for PDF export and embedded previews. */
  svgOnly?: boolean;
};
