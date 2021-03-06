const BASE_ENTITY = 'BaseEntity';
// utility function to climb up inheritance tree
// and execute callback on each hit. This will hit
// all models except BaseEntity
const inheritanceTraverse = function (model, ctx, cb) {
  // var m = model;

  // if (m.modelName === BASE_ENTITY) {
  //   return; //do nothing
  // }
  // else {
  //   if (cb(m.base)) {
  //     return;
  //   }
  //   else {
  //     inheritanceTraverse(m.base, ctx, cb);
  //   }
  // }

  if (model.base.modelName !== BASE_ENTITY && cb(model.base)) {
    // do nothing
    return;
  } else if (model.base.modelName === BASE_ENTITY) {
    return;
  }

  inheritanceTraverse(model.base, ctx, cb);
};

module.exports = {
  traverseInheritanceTree: inheritanceTraverse
};
