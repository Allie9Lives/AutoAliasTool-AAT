// ==UserScript==
// @name         Gmail Auto-Alias Tool (AAT)
// @namespace    http://tampermonkey.net/
// @version      v1.0.1
// @description  Fills Gmail aliases on websites and displays a single large badge in Gmail showing which alias an email was sent to.
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
            // Target recipient containers directly (works for existing and incoming messages)
            const recipientContainers = document.querySelectorAll('.hb, .gE');

            recipientContainers.forEach(container => {
                const textContent = container.innerText || container.textContent || '';
                const match = textContent.match(/\+([a-zA-Z0-9._-]+)/i);

                if (match) {
                    const aliasTag = match[1];
                    let pill = container.querySelector('.gmail-alias-inline-pill');

                    if (!pill) {
                        pill = document.createElement('div');
                        pill.className = 'gmail-alias-inline-pill';

                        pill.style.cssText = `
                            background: linear-gradient(135deg, #2563eb, #1d4ed8);
                            color: #ffffff;
                            font-size: 14px;
                            font-weight: 700;
                            padding: 5px 12px;
                            border-radius: 8px;
                            margin-top: 6px;
                            margin-bottom: 4px;
                            display: inline-block;
                            font-family: 'Google Sans', Roboto, sans-serif;
                            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.4);
                            letter-spacing: 0.3px;
                            border: 1px solid #60a5fa;
                        `;

                        container.appendChild(pill);
                    }

                    // Update inner text directly in case the container re-renders with a new message
                    pill.innerText = `🏷️ Sent to Alias: ${aliasTag}`;
                }
            });
        }

        // Debounce setup to handle fast real-time DOM updates efficiently
        let timeout = null;
        const observer = new MutationObserver(() => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(updateGmailInlineBadge, 150);
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }
})();