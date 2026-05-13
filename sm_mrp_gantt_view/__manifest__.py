# -*- coding: utf-8 -*-
{
    'name': 'Manufacturing Gantt View - Work Order Planning',
    'version': '19.0.1.0.0',
    'summary': 'Interactive manufacturing Gantt chart for work orders with drag-and-drop scheduling, dependencies, zoom, exports, and work center grouping.',
    'description': """
Manufacturing Gantt View - Odoo 19
==================================

Add an interactive Gantt chart to Odoo Manufacturing work orders.

**Work Order Scheduling**

Plan manufacturing operations visually on a Gantt timeline. Drag work
order bars to update start dates and durations while keeping Odoo work
orders synchronized.

**Work Center Grouping**

Operations are grouped by work center with collapsible rows, clear visual
separation, and color-coded manufacturing order bars.

**Manufacturing Dependencies**

Draw dependency links between work orders. Links are stored in Odoo's
native work order dependency fields so blocked and next operations stay
aligned with the manufacturing flow.

**Timeline Controls**

Navigate with previous, next, today, and zoom-to-fit actions. Switch
between hour, day, week, month, quarter, and year scales.

**Productivity Toolbar**

Sort by operation name, start date, or progress. Toggle grid panel,
critical path, tooltips, progress labels, weekend highlights, dependency
links, dynamic bar text, and fullscreen mode.

**Export**

Export the visible Gantt chart as SVG or export work order planning data
as CSV.

**Odoo Integration**

Adds a native Odoo 19 ``sm_mrp_gantt`` view type, integrates with
Manufacturing work order actions, opens work order and work center forms
on double-click, and adds Gantt planning fields to work order forms.
    """,
    'author': 'Steven Marp',
    'website': 'https://apps.odoo.com/apps/browse?repo_maintainer_id=512936',
    'category': 'Manufacturing',
    'license': 'OPL-1',
    'depends': ['base', 'mrp', 'web'],
    'data': [
        'views/mrp_workorder_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'sm_mrp_gantt_view/static/lib/dhtmlxgantt/js/dhtmlxgantt.js',
            'sm_mrp_gantt_view/static/lib/dhtmlxgantt/js/dhtmlxgantt_marker.js',
            'sm_mrp_gantt_view/static/lib/dhtmlxgantt/skins/dhtmlxgantt_material.css',
            'sm_mrp_gantt_view/static/src/gantt_view/gantt_arch_parser.js',
            'sm_mrp_gantt_view/static/src/gantt_view/gantt_model.js',
            'sm_mrp_gantt_view/static/src/gantt_view/gantt_renderer.js',
            'sm_mrp_gantt_view/static/src/gantt_view/gantt_controller.js',
            'sm_mrp_gantt_view/static/src/gantt_view/gantt_view.js',
            'sm_mrp_gantt_view/static/src/gantt_view.xml',
            'sm_mrp_gantt_view/static/src/gantt_view.scss',
        ],
    },
    'images': ['static/description/banner.gif'],
    'price': 79.90,
    'currency': 'USD',
    'installable': True,
    'application': False,
    'auto_install': False,
}
