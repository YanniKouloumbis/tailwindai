type KeyValuePair<TKey extends keyof any = string, TValue = string> = Record<
  TKey,
  TValue
>;

type ConfigUtils = {
  negative<TInput, TOutput>(input: TInput): TOutput;
  breakpoints<TInput, TOutput>(input: TInput): TOutput;
};

type ConfigDotNotationPath = string;

type ResolvableTo<TResult> =
  | TResult
  | ((
      theme: (path: ConfigDotNotationPath) => TResult,
      utils: ConfigUtils
    ) => TResult);

type BaseConfig = {
  important: boolean | string;
  target: "relaxed" | "ie11";
  prefix: string | ((className: string) => string);
  separator: string;
};

type PurgeConfig =
  /** Disabled */
  | false
  /** Shortcut, list of content paths */
  | string[]
  /** Explicit enabled/disabled + content paths */
  | { enabled: boolean; mode: "all" | "conservative"; content: string[] }
  /** Explicit enabled/disabled + purge options */
  | { enabled: boolean; options: { content: string[]; whitelist: string[] } };

type FutureSettings = "removeDeprecatedGapUtilities";
type FutureConfig = "all" | Record<FutureSettings, boolean> | FutureSettings[];

type ExperimentalSettings =
  | "uniformColorPalette"
  | "extendedSpacingScale"
  | "defaultLineHeights"
  | "extendedFontSizeScale"
  | "applyComplexClasses";

type ExperimentalConfig =
  | "all"
  | Partial<Record<ExperimentalSettings, boolean>>
  | ExperimentalSettings[];

type ThemeConfig = Partial<{
  extend: Partial<Omit<ThemeConfig, "extend">>;

  /** Responsiveness */
  screens: ResolvableTo<KeyValuePair>;

  /** Reusable base configs */
  colors: ResolvableTo<
    KeyValuePair | Record<string, Record<string | number, string>>
  >;
  spacing: ResolvableTo<KeyValuePair>;

  /** Background */
  backgroundColor: ThemeConfig["colors"];
  backgroundImage: ResolvableTo<KeyValuePair>;
  gradientColorStops: ThemeConfig["colors"];
  backgroundOpacity: ThemeConfig["opacity"];
  backgroundPosition: ResolvableTo<KeyValuePair>;
  backgroundSize: ResolvableTo<KeyValuePair>;

  /** Border */
  borderColor: ThemeConfig["colors"];
  borderOpacity: ThemeConfig["opacity"];
  borderRadius: ResolvableTo<KeyValuePair>;
  borderWidth: ResolvableTo<KeyValuePair>;

  /** Shadow */
  boxShadow: ResolvableTo<KeyValuePair>;

  /** Cursor */
  cursor: ResolvableTo<KeyValuePair>;

  /** Divider */
  divideColor: ThemeConfig["borderColor"];
  divideOpacity: ThemeConfig["borderOpacity"];
  devideWidth: ThemeConfig["borderWidth"];

  /** Svg */
  fill: ResolvableTo<KeyValuePair>;
  stroke: ResolvableTo<KeyValuePair>;
  strokeWidth: ResolvableTo<KeyValuePair>;

  /** Flexbox */
  flex: ResolvableTo<KeyValuePair>;
  flexGrow: ResolvableTo<KeyValuePair>;
  flexShrink: ResolvableTo<KeyValuePair>;

  /** Fonts */
  fontFamily: ResolvableTo<Record<string, string[]>>;
  fontSize: ResolvableTo<KeyValuePair>;
  fontWeight: ResolvableTo<KeyValuePair>;

  /** Sizes */
  height: ThemeConfig["spacing"];
  minHeight: ResolvableTo<KeyValuePair>;
  maxHeight: ResolvableTo<KeyValuePair>;
  width: ThemeConfig["spacing"];
  minWidth: ResolvableTo<KeyValuePair>;
  maxWidth: ResolvableTo<KeyValuePair>;

  /** Positioning */
  inset: ResolvableTo<KeyValuePair>;
  zIndex: ResolvableTo<KeyValuePair>;

  /** Text */
  letterSpacing: ResolvableTo<KeyValuePair>;
  lineHeight: ResolvableTo<KeyValuePair>;
  textColor: ThemeConfig["colors"];
  textOpacity: ThemeConfig["opacity"];

  /** Input */
  placeholderColor: ThemeConfig["colors"];
  placeholderOpacity: ThemeConfig["opacity"];

  /** Lists */
  listStyleType: ResolvableTo<KeyValuePair>;

  /** Layout */
  margin: ThemeConfig["spacing"];
  padding: ThemeConfig["spacing"];
  space: ThemeConfig["spacing"];
  opacity: ResolvableTo<KeyValuePair>;
  order: ResolvableTo<KeyValuePair>;

  /** Images */
  objectPosition: ResolvableTo<KeyValuePair>;

  /** Grid */
  gap: ThemeConfig["spacing"];
  gridTemplateColumns: ResolvableTo<KeyValuePair>;
  gridColumn: ResolvableTo<KeyValuePair>;
  gridColumnStart: ResolvableTo<KeyValuePair>;
  gridColumnEnd: ResolvableTo<KeyValuePair>;
  gridTemplateRows: ResolvableTo<KeyValuePair>;
  gridRow: ResolvableTo<KeyValuePair>;
  gridRowStart: ResolvableTo<KeyValuePair>;
  gridRowEnd: ResolvableTo<KeyValuePair>;

  /** Transformations */
  transformOrigin: ResolvableTo<KeyValuePair>;
  scale: ResolvableTo<KeyValuePair>;
  rotate: ResolvableTo<KeyValuePair>;
  translate: ThemeConfig["spacing"];
  skew: ResolvableTo<KeyValuePair>;

  /** Transitions */
  transitionProperty: ResolvableTo<KeyValuePair>;
  transitionTimingFunction: ResolvableTo<KeyValuePair>;
  transitionDuration: ResolvableTo<KeyValuePair>;
  transitionDelay: ResolvableTo<KeyValuePair>;

  /** Animations */
  animation: ResolvableTo<KeyValuePair>;
  keyframes: ResolvableTo<
    Record<string, Record<string, KeyValuePair | string>>
  >;

  /** Components */
  container: Partial<{
    screens:
      | string[] /** List of breakpoints. E.g.: '400px', '500px' */
      /** Named breakpoints. E.g.: { sm: '400px' } */
      | Record<string, string>
      /** Name breakpoints with explicit min and max values. E.g.: { sm: { min: '300px', max: '400px' } } */
      | Record<string, { min: string; max: string }>;
    center: boolean;
    padding: string | KeyValuePair;
  }>;

  /** Custom */
  [key: string]: any;
}>;

type VariantsConfig = string[] | Record<string, string[]>;

type CorePluginsConfig = string[] | Record<string, boolean>;

type VariantConfig =
  | string[]
  | Partial<{
      variants: string[];
      respectPrefix: false;
      respectImportant: false;
    }>;
type PluginAPI = {
  /** Get access to the whole config */
  config: <TDefaultValue = TailwindConfig>(
    path?: ConfigDotNotationPath,
    defaultValue?: TDefaultValue
  ) => TDefaultValue; // TODO: Or return value at path
  /** Escape classNames */
  e: (className: string) => string;
  /** Shortcut for the theme section of the config */
  theme: <TDefaultValue>(
    path: ConfigDotNotationPath,
    defaultValue: TDefaultValue
  ) => TDefaultValue; // TODO: Or return value at path
  variants: <TDefaultValue>(
    path: ConfigDotNotationPath,
    defaultValue: TDefaultValue
  ) => TDefaultValue; // TODO: Or return value at path
  target: (path: ConfigDotNotationPath) => string;
  /** Ability to add utilities. E.g.: .p-4 */
  addUtilities: (
    utilities: Record<string, KeyValuePair | Record<string, KeyValuePair>>,
    variantConfig?: VariantConfig
  ) => void;
  /** Ability to add components. E.g.: .btn */
  addComponents: (
    components: Record<string, KeyValuePair | Record<string, KeyValuePair>>,
    variantConfig?: VariantConfig
  ) => void;
};
type PluginCreator = (api: PluginAPI) => void;
type PluginsConfig = PluginCreator[];

/** The holy grail Tailwind config definition */
export type TailwindConfig = Partial<
  BaseConfig & {
    future: FutureConfig;
    experimental: ExperimentalConfig;
    purge: PurgeConfig;
    theme: ThemeConfig;
    variants: VariantsConfig;
    corePlugins: CorePluginsConfig;
    plugins: PluginsConfig;
  }
>;
