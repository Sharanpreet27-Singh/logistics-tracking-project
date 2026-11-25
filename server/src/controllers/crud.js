import { Op } from 'sequelize';
import { sequelize } from '../config/db.js';
import { serialize } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

/** Generic CRUD handlers with pagination, literal search, and whitelisted filters. */
export function crud({ Model, schema, searchFields = [], filters = [], include = [] }) {
  return {
    list: asyncHandler(async (req, res) => {
      const limit = Math.min(200, Math.max(1, Math.trunc(Number(req.query.limit)) || 50));
      const page = Math.min(Math.floor(Number.MAX_SAFE_INTEGER / limit), Math.max(1, Math.trunc(Number(req.query.page)) || 1));
      const where = {};
      for (const field of filters) {
        const value = req.query[field];
        if (typeof value !== 'string' || !value) continue;
        where[field] = value.includes(',') ? { [Op.in]: value.split(',').map((s) => s.trim()).filter(Boolean) } : value;
      }
      if (typeof req.query.search === 'string' && req.query.search && searchFields.length) {
        const text = sequelize.fn('LOWER', req.query.search);
        where[Op.or] = searchFields.map((field) => sequelize.where(
          sequelize.fn('LOCATE', text, sequelize.fn('LOWER', sequelize.col(`${Model.name}.${field}`))), { [Op.gt]: 0 }
        ));
      }
      const [rows, total] = await Promise.all([
        Model.findAll({ where, include, order: [['createdAt', 'DESC'], ['_id', 'DESC']], offset: (page - 1) * limit, limit }),
        Model.count({ where }),
      ]);
      res.json({ success: true, data: rows.map(serialize), meta: { page, limit, total } });
    }),
    get: asyncHandler(async (req, res) => {
      const row = await Model.findByPk(req.params.id, { include });
      if (!row) throw new ApiError(404, 'Not found');
      res.json({ success: true, data: serialize(row) });
    }),
    create: asyncHandler(async (req, res) => {
      const row = await Model.create(schema.parse(req.body));
      res.status(201).json({ success: true, data: row });
    }),
    update: asyncHandler(async (req, res) => {
      const changes = schema.partial().parse(req.body);
      const row = await sequelize.transaction(async (transaction) => {
        const record = await Model.findByPk(req.params.id, { transaction, lock: true });
        if (!record) throw new ApiError(404, 'Not found');
        return record.update(changes, { transaction });
      });
      res.json({ success: true, data: row });
    }),
    remove: asyncHandler(async (req, res) => {
      const count = await Model.destroy({ where: { _id: req.params.id } });
      if (!count) throw new ApiError(404, 'Not found');
      res.json({ success: true, message: 'Deleted' });
    }),
  };
}
