import { CATEGORY_SVG, CATEGORY_ICON_BG, CATEGORY_ICON_COLOR } from '../utils';

interface CategoryIconProps {
  category: string;
  size?: number;
  showBackground?: boolean;
}

/**
 * Renders an SVG icon for a category with optional background.
 */
export default function CategoryIcon({ category, size = 42, showBackground = true }: CategoryIconProps) {
  const svgString = CATEGORY_SVG[category] || CATEGORY_SVG['Khác'];
  const bgColor = CATEGORY_ICON_BG[category] || CATEGORY_ICON_BG['Khác'];
  const iconColor = CATEGORY_ICON_COLOR[category] || CATEGORY_ICON_COLOR['Khác'];

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: showBackground ? bgColor : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: iconColor,
      }}
      dangerouslySetInnerHTML={{
        __html: svgString.replace(
          '<svg',
          `<svg width="${size * 0.52}" height="${size * 0.52}" style="display:block;"`
        ),
      }}
    />
  );
}
