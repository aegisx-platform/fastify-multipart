module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type enum
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation
        'style', // Code style (formatting, etc.)
        'refactor', // Code refactoring
        'perf', // Performance improvements
        'test', // Adding or updating tests
        'chore', // Maintenance tasks
        'ci', // CI/CD changes
        'build', // Build system changes
        'revert' // Revert changes
      ]
    ],
    // Subject case (sentence-case, start-case, pascal-case, upper-case, lower-case, camel-case, kebab-case)
    'subject-case': [2, 'never', ['pascal-case', 'upper-case']],
    // Subject length
    'subject-max-length': [2, 'always', 72],
    'subject-min-length': [2, 'always', 3],
    // Body length
    'body-max-line-length': [2, 'always', 100],
    // Scope enum (optional - can define specific scopes)
    'scope-enum': [
      1,
      'always',
      [
        'plugin',
        'multipart',
        'swagger',
        'examples',
        'docs',
        'tests',
        'ci',
        'deps'
      ]
    ],
    // Make scope optional
    'scope-empty': [1, 'never'],
    // Subject format
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    // Type format
    'type-empty': [2, 'never'],
    'type-case': [2, 'always', 'lower-case']
  }
}
