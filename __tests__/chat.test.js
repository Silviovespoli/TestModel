import { generateUniqueId } from '../public/assets/js/chat.js';

describe('generateUniqueId', () => {
    test('dovrebbe generare un ID univoco che inizia con "chat_"', () => {
        const id1 = generateUniqueId();
        const id2 = generateUniqueId();
        expect(id1).not.toBe(id2);
        expect(id1).toMatch(/^chat_/);
    });
});