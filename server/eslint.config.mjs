// @ts-check
import tseslint from 'typescript-eslint'

export default tseslint.config(
    {
        ignores: ['eslint.config.mjs', 'dist/**', 'prisma/generated/**'],
    },
    ...tseslint.configs.recommended,
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
    {
        // Prisma imports are forbidden everywhere by default
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@prisma/*'],
                            message:
                                'Prisma imports are only allowed in src/repositories, src/infrastructure, and src/types/models.',
                        },
                    ],
                },
            ],
        },
    },
    {
        // Allow Prisma imports only in the data-access layer
        files: ['src/data/repositories/**', 'src/types/models/**', 'src/infrastructure/**'],
        rules: {
            'no-restricted-imports': 'off',
        },
    },
)
