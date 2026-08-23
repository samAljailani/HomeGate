const { pathsToModuleNameMapper } = require('ts-jest')
const ts = require('typescript')

const { config } = ts.readConfigFile('./tsconfig.json', ts.sys.readFile)

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    roots: ['<rootDir>/src', '<rootDir>/test'],
    testRegex: '.*\\.spec\\.ts$',
    transform: {
        '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
    },
    moduleNameMapper: {
        ...pathsToModuleNameMapper(config.compilerOptions.paths, { prefix: '<rootDir>/' }),
        // Override @prisma/generated with a Jest mock (no-op PrismaClient + real enums)
        '^@prisma/generated$': '<rootDir>/test/mocks/prismaGenerated.mock.ts',
    },
    collectCoverageFrom: ['**/*.(t|j)s'],
    coverageDirectory: '../coverage',
    testEnvironment: 'node',
}
