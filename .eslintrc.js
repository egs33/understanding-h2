module.exports = {
  root: true,
  extends: '@egs33',
  ignorePatterns: [
    '/dist/**',
  ],
  overrides: [
    {
      files: '*.ts',
      extends: '@egs33/eslint-config/typescript-node',
      parserOptions: {
        project: './tsconfig.json',
      },
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
