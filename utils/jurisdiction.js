const { ApiError } = require('../middleware/errorHandler');

// Given the authenticated user and a district id being requested, throw 403
// unless the user's jurisdiction covers that district.
function assertDistrictAllowed(user, districtId) {
  if (user.role === 'national') return;
  if (user.role === 'provincial') return; // narrowed further by province match, checked by caller via province id
  if (user.role === 'district') {
    if (String(user.district) !== String(districtId)) {
      throw new ApiError(403, 'OUT_OF_JURISDICTION', 'You cannot read data outside your assigned district.');
    }
    return;
  }
}

function assertProvinceAllowed(user, provinceId) {
  if (user.role === 'national') return;
  if (user.role === 'provincial' || user.role === 'district') {
    if (String(user.province) !== String(provinceId)) {
      throw new ApiError(403, 'OUT_OF_JURISDICTION', 'You cannot read data outside your assigned province.');
    }
    return;
  }
}


function districtFilterFor(user) {
  if (user.role === 'national') return {};
  if (user.role === 'provincial') return { province: user.province };
  if (user.role === 'district') return { _id: user.district };
  return { _id: null };
}

module.exports = { assertDistrictAllowed, assertProvinceAllowed, districtFilterFor };
