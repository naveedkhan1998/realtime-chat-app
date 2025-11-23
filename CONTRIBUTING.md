# Contributing to MNK Chat

First off, thanks for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to MNK Chat. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report. Following these guidelines helps maintainers and the community understand your report, reproduce the behavior, and find related reports.

- **Use a clear and descriptive title** for the issue to identify the problem.
- **Describe the exact steps which reproduce the problem** in as many details as possible.
- **Provide specific examples** to demonstrate the steps. Include links to files or GitHub projects, or copy/pasteable snippets, which you use in those examples.

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion, including completely new features and minor improvements to existing functionality.

- **Use a clear and descriptive title** for the issue to identify the suggestion.
- **Provide a step-by-step description of the suggested enhancement** in as many details as possible.
- **Explain why this enhancement would be useful** to most users.

### Pull Requests

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Styleguides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### Frontend (React/TypeScript)

- We use **Prettier** for formatting and **ESLint** for linting.
- Run `npm run lint` before committing.
- Use functional components and hooks.
- Follow the project structure (feature-based folders).

### Backend (Django/Python)

- We use **Black** for code formatting and **Ruff** for linting.
- Run `npx nx run api:format-check` to verify formatting.
- Follow PEP 8 guidelines.
- Keep business logic in services/selectors where possible, or thin views/fat models.

## Development Setup

Refer to the [README](README.md) for detailed setup instructions.
