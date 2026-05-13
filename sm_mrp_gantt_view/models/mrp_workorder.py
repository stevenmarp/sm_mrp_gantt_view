# -*- coding: utf-8 -*-

import json
from datetime import timedelta

from odoo import Command, api, fields, models


class MrpWorkorder(models.Model):
    _inherit = 'mrp.workorder'

    sm_gantt_duration_hours = fields.Float(
        string='Gantt Duration (hours)',
        compute='_compute_sm_gantt_duration_hours',
        inverse='_inverse_sm_gantt_duration_hours',
        store=True,
    )
    sm_gantt_open = fields.Boolean(string='Open in Gantt', default=True)
    sm_gantt_links_json = fields.Char(
        string='Serialized Gantt Links JSON',
        compute='_compute_sm_gantt_links_json',
    )

    @api.depends('date_start', 'date_finished', 'duration_expected')
    def _compute_sm_gantt_duration_hours(self):
        for workorder in self:
            if workorder.date_start and workorder.date_finished:
                elapsed = (workorder.date_finished - workorder.date_start).total_seconds()
                workorder.sm_gantt_duration_hours = max(elapsed / 3600.0, 1.0)
            elif workorder.duration_expected:
                workorder.sm_gantt_duration_hours = max(workorder.duration_expected / 60.0, 1.0)
            else:
                workorder.sm_gantt_duration_hours = 1.0

    def _inverse_sm_gantt_duration_hours(self):
        for workorder in self:
            if workorder.date_start and workorder.sm_gantt_duration_hours:
                workorder.date_finished = workorder.date_start + timedelta(hours=workorder.sm_gantt_duration_hours)

    @api.depends('blocked_by_workorder_ids')
    def _compute_sm_gantt_links_json(self):
        for workorder in self:
            links = []
            for blocker in workorder.blocked_by_workorder_ids:
                links.append({
                    'id': f'{blocker.id}-{workorder.id}',
                    'source': blocker.id,
                    'target': workorder.id,
                    'type': '0',
                })
            workorder.sm_gantt_links_json = json.dumps(links)

    @api.model
    def sm_gantt_create_link(self, source_id, target_id, relation_type='0'):
        source = self.browse(int(source_id)).exists()
        target = self.browse(int(target_id)).exists()
        if not source or not target or source == target:
            return False
        target.blocked_by_workorder_ids = [Command.link(source.id)]
        return f'{source.id}-{target.id}'

    @api.model
    def sm_gantt_delete_link(self, link_id):
        if not link_id:
            return False
        try:
            source_id, target_id = str(link_id).split('-', 1)
            source_id = int(source_id)
            target_id = int(target_id)
        except ValueError:
            return False
        target = self.browse(target_id).exists()
        if target:
            target.blocked_by_workorder_ids = [Command.unlink(source_id)]
        return True
