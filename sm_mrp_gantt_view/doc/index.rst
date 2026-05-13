================================================================
Manufacturing Gantt View - Odoo 19 User Guide
================================================================

.. contents:: Table of Contents
   :depth: 2
   :local:

----

1. Overview
===========

The **Manufacturing Gantt View** module adds an interactive Gantt chart
to Odoo Manufacturing work orders.

Use it to visualize shop floor schedules, drag work orders on the
timeline, create work order dependencies, group operations by work
center or manufacturing order, inspect progress, and export planning
data.

----

2. Installation
===============

1. Drop the ``sm_mrp_gantt_view`` folder in your Odoo ``addons`` path.
2. Restart Odoo and update the apps list.
3. Install **Manufacturing Gantt View** from the Apps menu.

The module depends on Odoo Manufacturing and Web.

----

3. Usage
========

Opening the Gantt View
----------------------

1. Go to **Manufacturing -> Operations -> Work Orders**.
2. Click the **Manufacturing Gantt** view icon in the view switcher.
3. Work orders appear grouped by work center.

Planning Work Orders
--------------------

1. Set **Start Date**, **End Date**, **Gantt Duration**, and review
   progress from the work order form under the **Gantt Planning** tab.
2. Drag work order bars in the Gantt chart to update the start date and
   duration.
3. Double-click a work order or group row to open its form.

Dependency Links
----------------

Draw links between work order bars to create dependencies. Links are
stored in Odoo's native ``blocked_by_workorder_ids`` relation.

----

4. Toolbar
==========

The Gantt toolbar provides:

- Previous, Today, and Next navigation
- Hour, Day, Week, Month, Quarter, and Year zoom levels
- Sorting by operation name, start date, and progress
- Grid panel toggle
- Critical path highlight
- Zoom to fit
- SVG export
- CSV export
- Fullscreen mode

Settings
--------

The settings menu lets each user toggle:

- Tooltips
- Progress text on work order bars
- Dynamic operation text on bars
- Weekend highlights
- Dependency links

Settings are stored in browser local storage.

----

5. Exports
==========

SVG Export
----------

Export the current Gantt chart view as an SVG file.

CSV Export
----------

Export work order planning data with:

- Operation name
- Start date
- End date
- Duration
- Progress
- Work center or manufacturing order group

----

6. Technical Notes
==================

- Custom Odoo view type: ``sm_mrp_gantt``
- Frontend library: dhtmlxGantt
- Work order data model: ``mrp.workorder``
- Date field: ``date_start``
- End field: ``date_finished``
- Computed duration field: ``sm_gantt_duration_hours``
- Link serialization field: ``sm_gantt_links_json``
- Native dependency field: ``blocked_by_workorder_ids``

----

7. Compatibility
================

- Tested on **Odoo 19.0 Community & Enterprise**.
- Requires Manufacturing.
- Uses Odoo web assets and standard ORM/RPC services.
