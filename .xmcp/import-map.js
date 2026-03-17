
export const tools = {
"src/tools/plone_add_single_block.ts": () => import("../src/tools/plone_add_single_block.ts"),
"src/tools/plone_configure.ts": () => import("../src/tools/plone_configure.ts"),
"src/tools/plone_create_blocks_layout.ts": () => import("../src/tools/plone_create_blocks_layout.ts"),
"src/tools/plone_create_content.ts": () => import("../src/tools/plone_create_content.ts"),
"src/tools/plone_create_user.ts": () => import("../src/tools/plone_create_user.ts"),
"src/tools/plone_delete_content.ts": () => import("../src/tools/plone_delete_content.ts"),
"src/tools/plone_get_block_schemas.ts": () => import("../src/tools/plone_get_block_schemas.ts"),
"src/tools/plone_get_content.ts": () => import("../src/tools/plone_get_content.ts"),
"src/tools/plone_get_navigation_tree.ts": () => import("../src/tools/plone_get_navigation_tree.ts"),
"src/tools/plone_get_site_info.ts": () => import("../src/tools/plone_get_site_info.ts"),
"src/tools/plone_get_type_schema.ts": () => import("../src/tools/plone_get_type_schema.ts"),
"src/tools/plone_get_types.ts": () => import("../src/tools/plone_get_types.ts"),
"src/tools/plone_get_vocabularies.ts": () => import("../src/tools/plone_get_vocabularies.ts"),
"src/tools/plone_get_workflow_info.ts": () => import("../src/tools/plone_get_workflow_info.ts"),
"src/tools/plone_remove_single_block.ts": () => import("../src/tools/plone_remove_single_block.ts"),
"src/tools/plone_search.ts": () => import("../src/tools/plone_search.ts"),
"src/tools/plone_transition_workflow.ts": () => import("../src/tools/plone_transition_workflow.ts"),
"src/tools/plone_update_content.ts": () => import("../src/tools/plone_update_content.ts"),
"src/tools/plone_update_single_block.ts": () => import("../src/tools/plone_update_single_block.ts"),
"src/tools/plone_update_user.ts": () => import("../src/tools/plone_update_user.ts"),
};

export const prompts = {
"src/prompts/create-example-site-workflow.ts": () => import("../src/prompts/create-example-site-workflow.ts"),
"src/prompts/create-page-workflow.ts": () => import("../src/prompts/create-page-workflow.ts"),
};

export const resources = {
"src/resources/(plone)/content.ts": () => import("../src/resources/(plone)/content.ts"),
"src/resources/(plone)/site.ts": () => import("../src/resources/(plone)/site.ts"),
"src/resources/(plone)/types.ts": () => import("../src/resources/(plone)/types.ts"),
};

export const clientBundles = {

};

export const middleware = () => import("../src/middleware.ts");
