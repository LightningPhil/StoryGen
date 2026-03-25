export interface SavedStory {
    id?: number;
    title: string;
    markdown: string;
    characters: string;
    audience: string;
    framework: string;
    style: string;
    date: string;
}
export declare function saveStoryToLibrary(story: SavedStory): Promise<number>;
export declare function getAllStories(): Promise<SavedStory[]>;
export declare function deleteStoryFromLibrary(id: number): Promise<void>;
