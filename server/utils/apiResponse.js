function success(res, data = {}, message = 'Operation successful', status = 200) {
  return res.status(status).json({ success: true, message, data });
}
function fail(res, message = 'Something went wrong', errors = [], status = 400) {
  return res.status(status).json({ success: false, message, errors });
}
module.exports = { success, fail };