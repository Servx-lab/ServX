export class SecurityViolation extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SecurityViolation';
    }
}

export const executeAction = async (payload: any) => {
    throw new Error('Not implemented');
};
