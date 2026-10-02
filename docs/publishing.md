# Publishing checklist

The repository supports building an unpacked extension ZIP. It does not currently publish automatically to a browser store.

1. Follow the [release checklist](development.md#release-checklist) and test the extracted ZIP in a fresh profile. Its root must contain `manifest.json`.
2. Register a Chrome Web Store publisher, secure the accounts with two-step verification, and verify the contact information. Publisher/account ownership is separate from the extension's product name.
3. Describe one purpose: reading and rendering Markdown documents in the browser. Explain `storage`, the content-script URL patterns, local file access, directory probing, and optional refresh honestly. Missing `host_permissions` does not mean no page access.
4. Provide a public privacy-policy URL, such as the [policy in this repository](https://github.com/emorywang/markdang/blob/main/PRIVACY.md), and confirm that the store accepts that format. Disclose the opt-in PlantUML flow and remote document assets; do not claim that all usage is completely offline.
5. Declare that execution logic is bundled. Inspect the final package for remote JavaScript, development code, version mismatches, and missing license notices.
6. Prepare the store icon, screenshots, promotional assets, descriptions, and reviewer instructions using the current dashboard's specifications. Demonstrate local-file permission setup and a web document served as plain text. Be explicit that MDX is read as Markdown without executing JSX.
7. Consider a private/unlisted installation test before public release. Those visibility modes still require policy review.
8. When adding automated publication later, check the current Chrome Web Store API and authentication documentation rather than copying an older API example.

Authoritative references (recheck before submission):

- [Register a developer account](https://developer.chrome.com/docs/webstore/register)
- [Prepare an extension](https://developer.chrome.com/docs/webstore/prepare)
- [Privacy policy requirements](https://developer.chrome.com/docs/webstore/program-policies/privacy)
- [User data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Minimum permissions](https://developer.chrome.com/docs/webstore/program-policies/permissions)
- [Manifest V3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)
