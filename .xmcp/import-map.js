
export const tools = {
"src/tools/greet.ts": () => import("../src/tools/greet.ts"),
};

export const prompts = {
"src/prompts/review-code.ts": () => import("../src/prompts/review-code.ts"),
};

export const resources = {
"src/resources/(config)/app.ts": () => import("../src/resources/(config)/app.ts"),
"src/resources/(users)/[userId]/index.ts": () => import("../src/resources/(users)/[userId]/index.ts"),
};

export const clientBundles = {

};


