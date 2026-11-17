import { Footer } from "../Footer";
import { PublicTalentImage } from "./PublicTalentMedia";
import { portfolioCoverImage } from "../../../backend/src/utils/publicTalentProfile.js";
import { PORTFOLIO_FONTS } from "../../../backend/src/utils/portfolioAppearance.js";
import "./publicPortfolioFonts.css";
import { portfolioBackgroundStyles, portfolioColorStyles } from "./portfolioColors";
import "./publicPortfolioColors.css";
import "./publicPortfolioBackground.css";
import { publicPortfolioStyles, publicPortfolioTheme } from "./publicPortfolioThemes";

// Shared only by public Talent profile, portfolio and CV presentations.
// Only portfolio content supplies the boolean. Other shared surfaces retain
// their existing footer. Free portfolios reuse the shared site Footer.
export default function PublicTalentPresentation({
  children, requiresQnduitBranding, centerContent = false, portfolioTheme, portfolioColors, portfolioFont, portfolioBackground, portfolioCover,
}) {
  const styles = publicPortfolioStyles(portfolioTheme);
  const cover = portfolioTheme === undefined ? null : portfolioCoverImage(portfolioCover);
  const colorStyles = portfolioTheme === undefined ? undefined : portfolioColorStyles(portfolioTheme, portfolioColors);
  const font = portfolioTheme === undefined ? undefined : PORTFOLIO_FONTS.find(option => option.id === portfolioFont);
  const backgroundStyles = portfolioTheme === undefined ? undefined : portfolioBackgroundStyles(portfolioTheme, portfolioBackground, portfolioColors);
  const appearanceStyles = colorStyles || backgroundStyles || font ? { ...colorStyles, ...backgroundStyles, ...(font ? { "--portfolio-font": font.family } : {}) } : undefined;
  return <main style={appearanceStyles} data-portfolio-font={font?.id} data-portfolio-background={backgroundStyles ? "custom" : undefined} data-portfolio-colors={colorStyles || backgroundStyles ? "custom" : undefined} data-portfolio-theme={portfolioTheme === undefined ? undefined : publicPortfolioTheme(portfolioTheme)} className="min-h-screen bg-[#0F1419] text-white">
    <div className={`mx-auto ${styles.container || "max-w-7xl"} px-4 py-8 sm:px-6 md:py-12${centerContent ? " flex min-h-screen w-full flex-col" : ""}`}>
      {cover && <header aria-label="Portfolio cover" className="mb-6 overflow-hidden rounded-2xl border border-white/10">
        <PublicTalentImage key={cover.url} src={cover.url} alt="Portfolio cover" className="h-36 w-full sm:h-56 lg:h-72" />
      </header>}
      {centerContent ? <div className="flex flex-1 flex-col items-center justify-center text-center">{children}</div> : children}
      {requiresQnduitBranding !== true && requiresQnduitBranding !== false && <footer className={`mt-10 border-t border-white/10 py-8 text-center${centerContent ? " shrink-0" : ""}`}>
        <a href="https://qnduit.com" className="mb-8 inline-flex min-h-11 items-center text-sm font-medium text-gray-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4">Powered by qnduit.com</a>
      </footer>}
    </div>
    {requiresQnduitBranding === true && <div className="mt-8 md:mt-12"><Footer /></div>}
  </main>;
}
