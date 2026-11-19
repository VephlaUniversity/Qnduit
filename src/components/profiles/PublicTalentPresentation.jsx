import { useLayoutEffect, useRef } from "react";
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
  const brandingBar = useRef(null);
  const showBranding = requiresQnduitBranding === true;
  useLayoutEffect(() => {
    const bar = brandingBar.current;
    if (!showBranding || !bar) return;
    const viewport = document.documentElement;
    const syncHeight = () => viewport.style.setProperty("--portfolio-brand-bar-height", `${bar.offsetHeight}px`);
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      viewport.style.removeProperty("--portfolio-brand-bar-height");
    };
  }, [showBranding]);
  const revealFocusedControl = event => {
    const bar = brandingBar.current;
    if (!bar || bar.contains(event.target)) return;
    const clearance = bar.getBoundingClientRect().bottom + 8;
    if (event.target.getBoundingClientRect().top < clearance) {
      event.target.scrollIntoView({ block: "start", inline: "nearest", behavior: "instant" });
    }
  };
  const styles = publicPortfolioStyles(portfolioTheme);
  const cover = portfolioTheme === undefined ? null : portfolioCoverImage(portfolioCover);
  const colorStyles = portfolioTheme === undefined ? undefined : portfolioColorStyles(portfolioTheme, portfolioColors);
  const font = portfolioTheme === undefined ? undefined : PORTFOLIO_FONTS.find(option => option.id === portfolioFont);
  const backgroundStyles = portfolioTheme === undefined ? undefined : portfolioBackgroundStyles(portfolioTheme, portfolioBackground, portfolioColors);
  const appearanceStyles = colorStyles || backgroundStyles || font ? { ...colorStyles, ...backgroundStyles, ...(font ? { "--portfolio-font": font.family } : {}) } : undefined;
  return <main style={appearanceStyles} onFocus={showBranding ? revealFocusedControl : undefined} data-portfolio-branding={showBranding ? "free" : undefined} data-portfolio-font={font?.id} data-portfolio-background={backgroundStyles ? "custom" : undefined} data-portfolio-colors={colorStyles || backgroundStyles ? "custom" : undefined} data-portfolio-theme={portfolioTheme === undefined ? undefined : publicPortfolioTheme(portfolioTheme)} className="min-h-screen bg-[#0F1419] text-white">
    {showBranding && <div ref={brandingBar} className="portfolio-brand-bar">
      <div className={`mx-auto flex ${styles.container || "max-w-7xl"} justify-center px-4 sm:justify-start sm:px-6`}>
        <a href="https://qnduit.com" className="inline-flex min-h-11 min-w-0 items-center gap-2 py-2 text-sm font-semibold text-white hover:underline focus-visible:outline-2 focus-visible:-outline-offset-2">
          <img src="/images/header-logo.svg" width="16" height="16" alt="" className="shrink-0" />
          <span>Built with Qnduit</span>
        </a>
      </div>
    </div>}
    <div className={`mx-auto ${styles.container || "max-w-7xl"} px-4 py-8 sm:px-6 md:py-12${centerContent ? " flex min-h-screen w-full flex-col" : ""}`}>
      {cover && <header aria-label="Portfolio cover" className="mb-6 overflow-hidden rounded-2xl border border-white/10">
        <PublicTalentImage key={cover.url} src={cover.url} alt="Portfolio cover" className="h-36 w-full sm:h-56 lg:h-72" />
      </header>}
      {centerContent ? <div className="flex flex-1 flex-col items-center justify-center text-center">{children}</div> : children}
      {requiresQnduitBranding !== true && requiresQnduitBranding !== false && <footer className={`mt-10 border-t border-white/10 py-8 text-center${centerContent ? " shrink-0" : ""}`}>
        <a href="https://qnduit.com" className="mb-8 inline-flex min-h-11 items-center text-sm font-medium text-gray-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4">Powered by qnduit.com</a>
      </footer>}
    </div>
    {showBranding && <div className="mt-8 md:mt-12">
      <Footer showPortfolioAttribution />
    </div>}
  </main>;
}
