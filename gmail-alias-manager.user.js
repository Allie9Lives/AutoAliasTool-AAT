// ==UserScript==
// @name         Gmail Auto-Alias Tool (AAT)
// @namespace    http://tampermonkey.net/
// @version      v1.0.1
// @description  Fills Gmail aliases on websites and displays a badge with favicon and expandable full alias details in Gmail.
// @author       Allie9Lives
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @updateURL    https://github.com/Allie9Lives/AutoAliasTool-AAT/releases/latest/download/gmail-alias-manager.user.js
// @downloadURL  https://github.com/Allie9Lives/AutoAliasTool-AAT/releases/latest/download/gmail-alias-manager.user.js
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // MODULE 1: Alias Generator (All Websites)
    // ==========================================
    let baseEmail = GM_getValue('gmail_base_email', '');

    function promptForEmail() {
        const input = prompt("Enter your base Gmail address (e.g., username@gmail.com):", baseEmail);
        if (input && input.includes('@gmail.com')) {
            GM_setValue('gmail_base_email', input.trim().toLowerCase());
            baseEmail = input.trim().toLowerCase();
            alert("Base email saved!");
        } else if (input !== null) {
            alert("Please enter a valid Gmail address.");
        }
    }

    GM_registerMenuCommand("Set Base Gmail Address", promptForEmail);

    if (!baseEmail && window.location.hostname !== 'mail.google.com') {
        setTimeout(promptForEmail, 1000);
    }

    function getAliasEmail() {
        if (!baseEmail) return '';
        const host = window.location.hostname.replace(/^www\./, '');
        const siteName = host.split('.')[0];
        const [username, domain] = baseEmail.split('@');
        return `${username}+${siteName}@${domain}`;
    }

    document.addEventListener('focusin', (e) => {
        const target = e.target;
        if (target.tagName === 'INPUT' && (target.type === 'email' || target.name.toLowerCase().includes('email') || target.id.toLowerCase().includes('email'))) {
            if (!target.dataset.aliasAttached) {
                target.dataset.aliasAttached = "true";
                target.title = "Double-click to insert Gmail Alias";

                target.addEventListener('dblclick', () => {
                    const alias = getAliasEmail();
                    if (alias) {
                        target.value = alias;
                        target.dispatchEvent(new Event('input', { bubbles: true }));
                        target.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
            }
        }
    });

    // ==========================================
    // MODULE 2: Dynamic Gmail Alias Highlighter
    // ==========================================
    if (window.location.hostname === 'mail.google.com') {

        function updateGmailInlineBadge() {
            const messages = document.querySelectorAll('.gs');

            messages.forEach(msg => {
                const recipientContainer = msg.querySelector('.hb, .gE');
                if (!recipientContainer) return;

                const headerText = recipientContainer.innerText || recipientContainer.textContent || '';
                const bodyText = msg.innerText || msg.textContent || '';

                // Prioritize exact full email match with alias (+) tag
                const match = headerText.match(/([a-zA-Z0-9._-]+)\+([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/i) ||
                              bodyText.match(/([a-zA-Z0-9._-]+)\+([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/i);

                if (match) {
                    const fullEmail = match[0];
                    const aliasTag = match[2];

                    let pillContainer = recipientContainer.querySelector('.gmail-alias-inline-container');

                    // GUARD: Skip re-rendering if this container already rendered this exact full email
                    if (pillContainer && pillContainer.dataset.renderedEmail === fullEmail) {
                        return;
                    }

                    let cleanDomain = aliasTag.replace(/[0-9]+$/, '').toLowerCase();
                    if (cleanDomain === 'chatgpt') cleanDomain = 'openai.com';
                    else if (!cleanDomain.includes('.')) cleanDomain += '.com';

                    const faviconUrl = `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=32`;

                    if (!pillContainer) {
                        pillContainer = document.createElement('div');
                        pillContainer.className = 'gmail-alias-inline-container';

                        pillContainer.style.cssText = `
                            margin-top: 6px !important;
                            margin-bottom: 4px !important;
                            display: block !important;
                            font-family: 'Google Sans', Roboto, sans-serif !important;
                        `;

                        recipientContainer.appendChild(pillContainer);
                    }

                    // Mark current full email on dataset to block observer loop
                    pillContainer.dataset.renderedEmail = fullEmail;
                    pillContainer.replaceChildren();

                    // Main Badge Pill
                    const pill = document.createElement('div');
                    pill.style.cssText = `
                        background: linear-gradient(135deg, #1e293b, #0f172a) !important;
                        color: #ffffff !important;
                        font-size: 13px !important;
                        font-weight: 600 !important;
                        padding: 4px 10px !important;
                        border-radius: 6px !important;
                        display: inline-flex !important;
                        align-items: center !important;
                        gap: 8px !important;
                        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25) !important;
                        border: 1px solid #3b82f6 !important;
                        width: fit-content !important;
                        line-height: 1.2 !important;
                    `;

                    const textSpan = document.createElement('span');
                    textSpan.style.cssText = 'white-space: nowrap; display: inline-block;';
                    textSpan.textContent = `Sent to Alias: ${aliasTag}`;

                    const img = document.createElement('img');
                    img.src = faviconUrl;
                    img.style.cssText = 'width: 14px; height: 14px; border-radius: 2px; display: block; flex-shrink: 0;';
                    img.onerror = function() {
                        this.remove();
                    };

                    pill.appendChild(textSpan);
                    pill.appendChild(img);

                    // Collapsible Details Element
                    const details = document.createElement('details');
                    details.style.cssText = `
                        margin-top: 4px !important;
                        font-size: 11px !important;
                        color: #94a3b8 !important;
                        cursor: pointer !important;
                        user-select: none !important;
                    `;

                    const summary = document.createElement('summary');
                    summary.textContent = 'Full Email Address';
                    summary.style.cssText = `
                        outline: none !important;
                        opacity: 0.8 !important;
                        transition: opacity 0.2s !important;
                    `;
                    summary.onmouseover = () => summary.style.opacity = '1';
                    summary.onmouseout = () => summary.style.opacity = '0.8';

                    const fullEmailContent = document.createElement('div');
                    fullEmailContent.textContent = fullEmail;
                    fullEmailContent.style.cssText = `
                        margin-top: 3px !important;
                        padding: 3px 6px !important;
                        background: #0f172a !important;
                        border-radius: 4px !important;
                        border: 1px solid #334155 !important;
                        color: #38bdf8 !important;
                        font-family: monospace !important;
                        display: inline-block !important;
                    `;

                    details.appendChild(summary);
                    details.appendChild(fullEmailContent);

                    pillContainer.appendChild(pill);
                    pillContainer.appendChild(details);
                }
            });
        }

        let timeout = null;
        const observer = new MutationObserver(() => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(updateGmailInlineBadge, 150);
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }
})();