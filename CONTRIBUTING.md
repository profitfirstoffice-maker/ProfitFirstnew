# Contributing to Profit First

Thank you for considering contributing to Profit First! This document provides guidelines and instructions for contributing.

## 🤝 How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/Aniket17200/Profitfirst/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details (OS, Node version, etc.)

### Suggesting Features

1. Check existing [Issues](https://github.com/Aniket17200/Profitfirst/issues) for similar suggestions
2. Create a new issue with:
   - Clear feature description
   - Use case and benefits
   - Possible implementation approach

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Test thoroughly
5. Commit with clear messages
6. Push to your fork
7. Open a Pull Request

## 🛠️ Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/Profitfirst.git
cd Profitfirst

# Add upstream remote
git remote add upstream https://github.com/Aniket17200/Profitfirst.git

# Install dependencies
npm install
cd client && npm install && cd ..

# Create .env file (see SETUP.md)
cp .env.example .env

# Start development
npm run dev
```

## 📝 Coding Standards

### JavaScript/Node.js
- Use ES6+ features
- Use async/await over callbacks
- Follow existing code style
- Add comments for complex logic
- Use meaningful variable names

### React
- Use functional components with hooks
- Keep components small and focused
- Use PropTypes or TypeScript
- Follow React best practices

### Git Commits
- Use clear, descriptive commit messages
- Format: `type: description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
```
feat: add revenue prediction feature
fix: resolve dashboard data loading issue
docs: update API documentation
```

## 🧪 Testing

Before submitting a PR:

```bash
# Test backend
node test-ai-market-questions.js
node verify-dashboard.js

# Test frontend
cd client
npm run build
```

## 📁 Project Structure

```
Profitfirst/
├── client/              # React frontend
├── controller/          # API controllers
├── services/           # Business logic
├── routes/             # API routes
├── models/             # Database models
├── middleware/         # Express middleware
├── jobs/               # Background jobs
└── scripts/            # Utility scripts
```

## 🎯 Areas for Contribution

### High Priority
- [ ] Add unit tests
- [ ] Improve error handling
- [ ] Add rate limiting
- [ ] Optimize database queries
- [ ] Improve AI responses

### Medium Priority
- [ ] Add more chart types
- [ ] Improve mobile responsiveness
- [ ] Add export features
- [ ] Add email notifications
- [ ] Multi-language support

### Low Priority
- [ ] Dark mode
- [ ] Custom themes
- [ ] Advanced filters
- [ ] Keyboard shortcuts

## 🔍 Code Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, PR will be merged
4. Your contribution will be credited

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in the project

## 💬 Communication

- GitHub Issues for bugs and features
- Pull Requests for code contributions
- Discussions for questions and ideas

## ✅ Checklist Before Submitting PR

- [ ] Code follows project style
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Commit messages are clear
- [ ] No console.log statements
- [ ] No commented-out code
- [ ] .env.example updated if needed

Thank you for contributing! 🎉
