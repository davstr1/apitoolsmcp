module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Override default rules if needed
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation changes
        'style', // Formatting, missing semicolons, etc.
        'refactor', // Code refactoring
        'test', // Adding tests
        'chore', // Maintenance tasks
        'perf', // Performance improvements
        'ci', // CI/CD changes
        'build', // Build system changes
        'revert', // Revert commits
      ],
    ],
  },
};
