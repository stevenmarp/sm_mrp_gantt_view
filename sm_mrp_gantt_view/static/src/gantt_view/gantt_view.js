/** @odoo-module **/

import { registry } from "@web/core/registry";
import { MrpGanttArchParser } from "./gantt_arch_parser";
import { MrpGanttModel } from "./gantt_model";
import { MrpGanttRenderer } from "./gantt_renderer";
import { MrpGanttController } from "./gantt_controller";

const viewRegistry = registry.category("views");

export const smMrpGanttView = {
    type: "sm_mrp_gantt",
    display_name: "Manufacturing Gantt",
    icon: "fa-industry",
    multiRecord: true,
    Controller: MrpGanttController,
    Renderer: MrpGanttRenderer,
    Model: MrpGanttModel,
    ArchParser: MrpGanttArchParser,
    searchMenuTypes: ["filter", "favorite"],

    props: (genericProps, view) => {
        const { arch, fields, resModel } = genericProps;
        const parser = new view.ArchParser();
        const archInfo = parser.parse(arch, fields);
        const modelParams = {
            resModel,
            fields,
            ...archInfo,
        };
        return {
            ...genericProps,
            modelParams,
            Model: view.Model,
            Renderer: view.Renderer,
            archInfo,
        };
    },
};

viewRegistry.add("sm_mrp_gantt", smMrpGanttView);
