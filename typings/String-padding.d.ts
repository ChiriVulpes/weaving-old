interface String {
    padLeft(len: number, pad: string): string;
    padRight(len: number, pad: string): string;
    tailsMatch(startsWith: string, endsWith: string): boolean;
}