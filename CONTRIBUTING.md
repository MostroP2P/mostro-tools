# Contributing to MostroP2P Tools

Thanks for your interest in contributing to MostroP2P Tools! This library aims to make it easier for developers to interact with the MostroP2P protocol. Anyone is welcome to contribute.

## Getting Started

If you're looking for somewhere to start contributing, check out the [good first issue](https://github.com/your-repo/mostro-tools/labels/good%20first%20issue) list.

## Communication Channels

- **Development Discussion**: Join our [Telegram developer group](https://t.me/mostro_dev)
- **General Discussion**: Join our [main Telegram group](https://t.me/MostroP2P)
- **Technical Discussion**: GitHub issues and pull requests
- **Nostr**: Follow us at `npub1ykvsmrmw2hk7jgxgy64zr8tfkx4nnjhq9eyfxdlg3caha3ph0skq6jr3z0`

## Development Workflow

1. Fork the repository
2. Create a topic branch from the `main` branch

   ```bash
   git checkout -b feat/new-feature
   # or
   git checkout -b fix/some-bug
   ```

3. Make your changes
4. Write tests for your changes
5. Run tests and ensure all pass

   ```bash
   npm run test
   ```

6. Run linting and type checking

   ```bash
   npm run lint
   npm run type-check
   ```

7. Commit your changes with a clear message
8. Submit a pull request

## Branch Naming Convention

- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

## Pull Request Guidelines

Each pull request should focus on a single change. For example:

- ✅ Add new feature to orders handling
- ✅ Fix bug in message encryption
- ❌ Add new feature AND refactor message handling (should be two PRs)

### Pull Request Process

1. Update the README.md and documentation with details of any changes to the interface
2. Update the CHANGELOG.md following [Keep a Changelog](https://keepachangelog.com/) format
3. Update the examples if necessary
4. Ensure all tests pass and no linting errors exist
5. Request review from maintainers

## Code Style Guide

We use ESLint and Prettier to maintain code quality. Before committing, run:

```bash
npm run lint
npm run format
```

### TypeScript Guidelines

- Prefer interfaces over types unless you need specific type features
- Use meaningful variable names
- Document public APIs using JSDoc comments
- Use strict TypeScript settings (strict: true)

## Testing

- All new features must include unit tests
- Integration tests for new features are highly encouraged
- Maintain or improve code coverage
- Tests should be meaningful and not just for coverage

## Commit Guidelines

### Commit Message Format

```bash
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- feat: A new feature
- fix: A bug fix
- docs: Documentation only changes
- refactor: Code change that neither fixes a bug nor adds a feature
- test: Adding missing tests or correcting existing tests
- chore: Changes to the build process or auxiliary tools

## Review Process

We follow a review process similar to Bitcoin Core:

- `ACK`: Tested the code and agree it should be merged
- `NACK`: Disagree with the merge (must include technical justification)
- `utACK`: Code looks good but haven't tested
- `Concept ACK`: Agree with the concept but haven't reviewed in detail
- `Nit`: Minor, non-blocking issues

## Setting Up Development Environment

1. Clone your fork:

   ```bash
   git clone https://github.com/your-username/mostro-tools.git
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a branch for your changes:

   ```bash
   git checkout -b feat/my-feature
   ```

4. Run tests:

   ```bash
   npm test
   ```

## Questions?

Feel free to ask questions in our [Telegram developer group](https://t.me/mostro_dev) or open an issue on GitHub.

Thank you for contributing to MostroP2P Tools! 🚀
