// 意図: 外部利用者の旧importを維持し、内部実装は正規のdomain/UIパスに集約する。
export {
  DEFAULT_SETTINGS,
  normalizeCtrlEnterSendMode,
  postFormatMap,
  type CtrlEnterSendMode,
  type EditorExpansionMode,
  type OpenInNewWindowMode,
  type PostFormatOption,
  type Settings,
} from "src/core/domain/settings";
export { MFDISettingTab } from "src/features/settings/MFDISettingTab";
