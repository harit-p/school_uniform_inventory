import School from '../models/School.js';

export async function listSchools(req, res) {
  try {
    const schools = await School.find({ isActive: true })
      .sort({ name: 1 })
      .lean();
    res.json(schools);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getSchool(req, res) {
  try {
    const school = await School.findById(req.params.id).lean();
    if (!school) return res.status(404).json({ error: 'School not found' });
    res.json(school);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createSchool(req, res) {
  try {
    const school = await School.create(req.body);
    res.status(201).json(school);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'School code already exists' });
    }
    res.status(400).json({ error: err.message });
  }
}

export async function updateSchool(req, res) {
  try {
    const school = await School.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).lean();
    if (!school) return res.status(404).json({ error: 'School not found' });
    res.json(school);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'School code already exists' });
    }
    res.status(400).json({ error: err.message });
  }
}

export async function deleteSchool(req, res) {
  try {
    const school = await School.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!school) return res.status(404).json({ error: 'School not found' });
    res.json({ message: 'School deactivated', school });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function addPreset(req, res) {
  try {
    const school = await School.findById(req.params.id);
    if (!school) return res.status(404).json({ error: 'School not found' });
    school.uniformPresets.push(req.body);
    await school.save();
    const added = school.uniformPresets[school.uniformPresets.length - 1];
    res.status(201).json(added);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function updatePreset(req, res) {
  try {
    const { id, pid } = req.params;
    const school = await School.findById(id);
    if (!school) return res.status(404).json({ error: 'School not found' });
    const idx = school.uniformPresets.findIndex(
      (p) => p._id.toString() === pid
    );
    if (idx === -1) return res.status(404).json({ error: 'Preset not found' });
    school.uniformPresets[idx].set(req.body);
    await school.save();
    res.json(school.uniformPresets[idx]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function deletePreset(req, res) {
  try {
    const { id, pid } = req.params;
    const school = await School.findById(id);
    if (!school) return res.status(404).json({ error: 'School not found' });
    school.uniformPresets.pull(pid);
    await school.save();
    res.json({ message: 'Preset deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function cloneSchool(req, res) {
  try {
    const { sourceSchoolId, name, code, address, contactPerson, phone } = req.body;
    if (!sourceSchoolId || !name || !code) {
      return res.status(400).json({
        error: 'sourceSchoolId, name and code are required',
      });
    }
    const source = await School.findById(sourceSchoolId).lean();
    if (!source) return res.status(404).json({ error: 'Source school not found' });
    const school = await School.create({
      name,
      code: code.trim().toUpperCase(),
      address: address || source.address,
      contactPerson: contactPerson || source.contactPerson,
      phone: phone || source.phone,
      uniformPresets: source.uniformPresets || [],
      isActive: true,
    });
    res.status(201).json(school);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'School code already exists' });
    }
    res.status(400).json({ error: err.message });
  }
}
