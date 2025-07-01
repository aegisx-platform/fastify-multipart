# Contributing to @aegisx/fastify-multipart

Thank you for considering contributing to this project! Here's how you can help make this plugin better.

## 🐛 Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include:

- **Clear title** describing the issue
- **Detailed description** of what you expected vs what happened
- **Minimal reproduction case** with code examples
- **Environment details** (Node.js version, Fastify version, OS)
- **Error messages** and stack traces if applicable

## 💡 Suggesting Features

Feature suggestions are welcome! Please:

- Check if the feature already exists or is planned
- Explain the use case and benefits
- Provide examples of how it would work
- Consider backwards compatibility

## 🔧 Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/your-username/fastify-multipart.git
   cd fastify-multipart
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run tests:**
   ```bash
   npm test
   ```

4. **Run examples:**
   ```bash
   npm run example:basic
   npm run example:swagger
   npm run example:streaming
   ```

5. **Lint code:**
   ```bash
   npm run lint
   npm run lint:fix  # Fix automatically
   ```

6. **Git hooks are automatically installed:**
   - **pre-commit**: Runs linting and tests
   - **commit-msg**: Validates commit message format

## 📝 Commit Convention

This project uses [Conventional Commits](https://conventionalcommits.org/) for automated versioning and enforces it with **commitlint**. Please format your commits as:

```
type(scope): description

[optional body]

[optional footer]
```

### Types:
- `feat`: New feature
- `fix`: Bug fix  
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `build`: Build system changes
- `revert`: Revert changes

### Scopes (optional):
- `plugin`: Core plugin changes
- `multipart`: Multipart handling
- `swagger`: Swagger integration
- `examples`: Example files
- `docs`: Documentation
- `tests`: Test files
- `ci`: CI/CD configuration
- `deps`: Dependencies

### Rules:
- **Subject**: 3-72 characters, no period at end
- **Type**: Required, lowercase
- **Scope**: Optional but recommended
- **Body**: Max 100 characters per line

### Examples:
```bash
feat(plugin): add streaming upload support
fix(swagger): resolve ui validation errors
docs(examples): update README with new examples
test(multipart): add tests for error handling
chore(deps): update dependencies
```

### Validation:
Commits are automatically validated by commitlint. Invalid commits will be rejected:

```bash
# ✅ Valid
feat(plugin): add new feature
fix: resolve bug

# ❌ Invalid
Feature: add new feature (wrong type)
fix (missing colon)
feat: (empty subject)
```

## 🧪 Testing

- **Write tests** for new features and bug fixes
- **Ensure all tests pass** before submitting PR
- **Test examples** to ensure they work correctly
- **Test with different Fastify versions** if relevant

### Test Structure:
```bash
test/
├── plugin.test.js       # Main plugin tests
├── fixtures/            # Test fixtures
└── helpers/             # Test helpers
```

### Running Tests:
```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run example:basic    # Test examples
```

## 📚 Documentation

- Update README if you change public APIs
- Add JSDoc comments for new functions
- Update TypeScript definitions in `index.d.ts`
- Add examples for new features

## 🔀 Pull Request Process

1. **Create a feature branch:**
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** following the guidelines above

3. **Test thoroughly:**
   ```bash
   npm run lint
   npm test
   npm run example:basic
   ```

4. **Commit using conventional format:**
   ```bash
   git commit -m "feat: add new feature description"
   ```

5. **Push and create pull request:**
   ```bash
   git push origin feat/your-feature-name
   ```

6. **Fill out the PR template** with:
   - Clear description of changes
   - Link to related issues
   - Testing instructions
   - Breaking changes (if any)

## 🚀 Release Process

This project uses automated releases via semantic-release:

- **Commits to main branch** trigger automated analysis
- **Version bumping** happens automatically based on commit types
- **Releases are published** to npm automatically
- **Changelog** is updated automatically

### Version Bumping:
- `fix:` → Patch version (1.0.0 → 1.0.1)
- `feat:` → Minor version (1.0.0 → 1.1.0)
- `feat!:` or `BREAKING CHANGE:` → Major version (1.0.0 → 2.0.0)

## 🎯 Code Style

- Use **JavaScript Standard Style**
- **No semicolons** (standard style)
- **2 spaces** for indentation
- **Descriptive variable names**
- **JSDoc comments** for public APIs

### Linting:
```bash
npm run lint        # Check style
npm run lint:fix    # Fix automatically
```

## 🔍 Code Review

All submissions require code review. We look for:

- **Code quality** and readability
- **Test coverage** for new code
- **Documentation** updates
- **Performance** considerations
- **Security** implications
- **Backwards compatibility**

## 📋 Examples Guidelines

When adding examples:

- **Self-contained** and runnable
- **Well-documented** with comments
- **Realistic use cases**
- **Include test commands**
- **Update examples/README.md**

## ❓ Questions?

- **GitHub Issues** for bug reports and feature requests
- **Discussions** for questions and community chat
- **Email** maintainers for security issues

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🙏