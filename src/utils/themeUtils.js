export const applyThemeColors = (variant, variantData) => {
    if (!variantData) return;

    const root = document.documentElement;

    // Apply background colors
    if (variantData.backgrounds) {
        root.style.setProperty('--bg-primary', variantData.backgrounds.primary);
        root.style.setProperty('--bg-secondary', variantData.backgrounds.secondary);
        root.style.setProperty('--bg-tertiary', variantData.backgrounds.tertiary);
        root.style.setProperty('--bg-surface', variantData.backgrounds.surface);
        root.style.setProperty('--bg-elevated', variantData.backgrounds.elevated);
        root.style.setProperty('--bg-hover', variantData.backgrounds.hover);
    }

    // Apply text colors
    if (variantData.text) {
        root.style.setProperty('--text-primary', variantData.text.primary);
        root.style.setProperty('--text-secondary', variantData.text.secondary);
        root.style.setProperty('--text-tertiary', variantData.text.tertiary);
        root.style.setProperty('--text-muted', variantData.text.muted);
        root.style.setProperty('--text-bright', variantData.text.bright);
    }

    // Apply accent colors
    if (variantData.accents) {
        root.style.setProperty('--accent-cyan', variantData.accents.cyan);
        root.style.setProperty('--accent-cyan-bright', variantData.accents.cyanBright);
        root.style.setProperty('--accent-purple', variantData.accents.purple);
        root.style.setProperty('--accent-purple-dark', variantData.accents.purpleDark);
        root.style.setProperty('--accent-purple-darker', variantData.accents.purpleDarker);
        root.style.setProperty('--accent-pink', variantData.accents.pink);
        root.style.setProperty('--accent-pink-bright', variantData.accents.pinkBright);
        root.style.setProperty('--accent-pink-hot', variantData.accents.pinkHot);
        root.style.setProperty('--accent-orange', variantData.accents.orange);
        root.style.setProperty('--accent-orange-bright', variantData.accents.orangeBright);
    }

    // Apply border colors
    if (variantData.borders) {
        root.style.setProperty('--border-primary', variantData.borders.primary);
        root.style.setProperty('--border-secondary', variantData.borders.secondary);
        root.style.setProperty('--border-accent', variantData.borders.accent);
        root.style.setProperty('--border-cyan', variantData.borders.cyan);
    }

    // Apply status colors
    if (variantData.status) {
        root.style.setProperty('--status-error', variantData.status.error);
        root.style.setProperty('--status-warning', variantData.status.warning);
        root.style.setProperty('--status-success', variantData.status.success);
        root.style.setProperty('--status-info', variantData.status.info);
    }

    // Apply syntax colors
    if (variantData.syntax) {
        root.style.setProperty('--syntax-comment', variantData.syntax.comment);
        root.style.setProperty('--syntax-keyword', variantData.syntax.keyword);
        root.style.setProperty('--syntax-control', variantData.syntax.control);
        root.style.setProperty('--syntax-function', variantData.syntax.function);
        root.style.setProperty('--syntax-class', variantData.syntax.class);
        root.style.setProperty('--syntax-string', variantData.syntax.string);
        root.style.setProperty('--syntax-number', variantData.syntax.number);
        root.style.setProperty('--syntax-variable', variantData.syntax.variable);
        root.style.setProperty('--syntax-property', variantData.syntax.property);
        root.style.setProperty('--syntax-operator', variantData.syntax.operator);
        root.style.setProperty('--syntax-punctuation', variantData.syntax.punctuation);
    }

    // Apply shadow and overlay colors
    if (variantData.shadows) {
        root.style.setProperty('--shadow-sm', variantData.shadows.sm);
        root.style.setProperty('--shadow-md', variantData.shadows.md);
        root.style.setProperty('--shadow-lg', variantData.shadows.lg);
    }

    if (variantData.overlays) {
        root.style.setProperty('--overlay-bg', variantData.overlays.bg);
        root.style.setProperty('--overlay-hover', variantData.overlays.hover);
    }
};
