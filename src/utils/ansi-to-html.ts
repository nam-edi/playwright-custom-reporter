/**
 * Convertit les codes ANSI en HTML avec les couleurs correspondantes
 */
export function ansiToHtml(text: string): string {
  if (!text) return text;

  // Codes ANSI de base
  const ansiCodes: { [key: string]: string } = {
    // Reset
    "0": "",
    "22": "", // Normal intensity
    "27": "", // No reverse
    "39": "", // Default foreground

    // Styles
    "1": '<span style="font-weight: bold">',
    "2": '<span style="opacity: 0.7">',
    "7": '<span class="ansi-reverse">',

    // Couleurs de premier plan
    "30": '<span style="color: #374151">', // Noir
    "31": '<span style="color: #ef4444">', // Rouge - plus vif
    "32": '<span style="color: #22c55e">', // Vert - plus vif
    "33": '<span style="color: #eab308">', // Jaune - plus vif
    "34": '<span style="color: #3b82f6">', // Bleu
    "35": '<span style="color: #a855f7">', // Magenta
    "36": '<span style="color: #06b6d4">', // Cyan
    "37": '<span style="color: #6b7280">', // Blanc/Gris

    // Couleurs de premier plan brillantes
    "90": '<span style="color: #6b7280">', // Gris foncé
    "91": '<span style="color: #ef4444">', // Rouge brillant
    "92": '<span style="color: #10b981">', // Vert brillant
    "93": '<span style="color: #f59e0b">', // Jaune brillant
    "94": '<span style="color: #3b82f6">', // Bleu brillant
    "95": '<span style="color: #a855f7">', // Magenta brillant
    "96": '<span style="color: #06b6d4">', // Cyan brillant
    "97": '<span style="color: #f9fafb">', // Blanc brillant
  };

  let result = text;

  // Stack pour gérer l'imbrication des spans
  let openTags: string[] = [];
  let currentColor: string | null = null;

  // Pattern pour capturer les séquences d'échappement ANSI
  const ansiPattern = /\x1b\[(\d+(?:;\d+)*)m/g;

  result = result.replace(ansiPattern, (match, codes) => {
    const codeList = codes.split(";");
    let html = "";

    for (const code of codeList) {
      if (code === "0" || code === "22" || code === "27" || code === "39") {
        // Codes de reset - fermer tous les spans ouverts
        html += "</span>".repeat(openTags.length);
        openTags = [];
        currentColor = null;
      } else if (code === "7") {
        // Inversion vidéo - utiliser une classe spécifique selon la couleur actuelle
        let reverseClass = "ansi-reverse";
        if (currentColor === "32") {
          // Vert -> Expected
          reverseClass = "ansi-reverse-expected";
        } else if (currentColor === "31") {
          // Rouge -> Received
          reverseClass = "ansi-reverse-received";
        }
        html += `<span class="${reverseClass}">`;
        openTags.push("7");
      } else if (code === "31" || code === "32") {
        // Capturer la couleur courante
        currentColor = code;
        if (ansiCodes[code]) {
          html += ansiCodes[code];
          openTags.push(code);
        }
      } else if (ansiCodes[code]) {
        // Ajouter le nouveau style
        html += ansiCodes[code];
        openTags.push(code);
      }
    }

    return html;
  });

  // Nettoyer les codes ANSI restants qui ne sont pas dans notre mapping
  result = result.replace(/\x1b\[[0-9;]*m/g, "");

  // Convertir les espaces multiples en espaces insécables pour préserver le formatage
  result = result.replace(/ {2,}/g, (spaces) => {
    return "&nbsp;".repeat(spaces.length);
  });

  // Préserver les sauts de ligne
  result = result.replace(/\n/g, "<br>");

  // Fermer tous les spans ouverts à la fin
  result += "</span>".repeat(openTags.length);

  return result;
}

/**
 * Convertit un message d'erreur avec codes ANSI en HTML formaté
 */
export function formatErrorMessage(message: string): string {
  if (!message) return message;

  return ansiToHtml(message);
}

/**
 * Convertit une stack trace avec codes ANSI en HTML formaté
 */
export function formatStackTrace(stack: string): string {
  if (!stack) return stack;

  return ansiToHtml(stack);
}
