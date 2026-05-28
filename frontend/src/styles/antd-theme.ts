import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context';

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#0d9488',
    colorPrimaryBg: '#f0fdfa',
    colorPrimaryBgHover: '#ccfbf1',
    colorPrimaryBorder: '#0d9488',
    colorPrimaryHover: '#0f766e',
    colorPrimaryActive: '#0f766e',

    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#3b82f6',

    colorBgContainer: '#ffffff',
    colorBgLayout: '#f8fafc',
    colorBgElevated: '#ffffff',
    colorBorder: '#e2e8f0',
    colorBorderSecondary: '#f1f5f9',

    colorText: '#1e293b',
    colorTextSecondary: '#64748b',
    colorTextTertiary: '#94a3b8',

    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,

    fontFamily:
      "'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeXL: 20,
    fontSizeHeading1: 28,
    fontSizeHeading2: 24,
    fontSizeHeading3: 18,
    lineHeight: 1.7,
    lineHeightLG: 1.8,
    lineHeightSM: 1.5,
    paddingLG: 24,
    paddingXL: 32,
    paddingXS: 8,
    controlHeight: 36,
    controlHeightLG: 44,
    controlHeightSM: 28,
  },
};
