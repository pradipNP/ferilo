# Contributing to FERILO

Thanks for your interest in contributing. FERILO is an open-source learning / portfolio marketplace project.

## How to contribute

1. Fork the repository
2. Create a branch from `main` (`feat/...`, `fix/...`, or `docs/...`)
3. Install and run locally (see README Quick start)
4. Make a focused change
5. Run `npm run lint` and `npm test`
6. Open a pull request describing **what** and **why**

## Good first contributions

- Documentation fixes and clearer setup steps
- UI accessibility and mobile polish
- Extra tests around auth, orders, or validation
- Bug reports with steps to reproduce
- Small features discussed in an issue first

## Local checklist

```bash
npm install
cp .env.example .env
npm run db:setup
npm run dev
npm run lint
npm test
```

Use the demo accounts in the README to explore flows before coding.

## Issue guidelines

When opening an issue, include:

- Expected vs actual behavior
- Steps to reproduce
- Environment (local / live demo)
- Screenshots or API error JSON when useful

## Code style

- Prefer small, readable JavaScript changes that match existing patterns
- Avoid unrelated refactors in the same PR
- Do not commit `.env`, uploads, or secrets

## Community

Be respectful. This project is meant for learning and collaboration.

## License

By contributing, you agree that your contributions are licensed under the MIT License.
