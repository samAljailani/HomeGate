export type MessageFlag = 'silent' | 'toast' | 'log';
export type MessageSeverity = 'Debug' | 'Info' | 'Warn' | 'Error' | 'Critical'

export type ApiMessage = {
    text: string;
    flag: MessageFlag[];
    severity: MessageSeverity
};

export type ApiResponse<T = unknown> = {
    success: boolean;
    data?: T;
    messages: ApiMessage[];
};

export type HandleApiOptions = {
    statusCode?: number;
    errorFlag?: MessageFlag;
    messages?: ApiMessage[];
};

export function concatApiMessages<T = unknown>(targetResponse: ApiResponse<T>, sourceResponse: ApiResponse<T>){
    targetResponse.messages.push(...sourceResponse.messages);
}

export function AddMessage<T = unknown>(response: ApiResponse<T>, messageFlags: MessageFlag[], messageSeverity: MessageSeverity, message: string){
    const apiMessage: ApiMessage = {text: message, flag: [...messageFlags], severity: messageSeverity};

    response.messages.push(apiMessage);
}

//LogMessage()
// export async function HandleApiMessage<T>(
//     action: () => Promise<T> | T,
//     options: HandleApiOptions = {}
// ): Promise<ApiResponse<T>> {
//     const { statusCode = 200, errorFlag = 'logInfo', messages } = options;
//     try {
//         const data = await action();
//         return { success: true, statusCode, data, ...(messages && { messages }) };
//     } catch (err) {
//         const errorStatus = (err as Record<string, unknown>)?.['status'];
//         const resolvedStatus = typeof errorStatus === 'number' ? errorStatus : 500;
//         const text = err instanceof Error ? err.message : 'An unexpected error occurred';
//         return {
//             success: false,
//             statusCode: resolvedStatus,
//             messages: [{ text, flag: errorFlag }, ...(messages ?? [])],
//         };
//     }
// }

// void LogMessage
// export async function HandleAndLogResponse<T>(
//     action: () => Promise<T> | T,
//     response: ApiResponse<T>,
//     successMessage: string,
//     failM
    

// )
