Component({
  properties: {
    /** 考试进度列表，与 normalizeIiqeRecords / normalizeMemberExamRecords 返回结构一致 */
    list: {
      type: Array,
      value: [],
    },
    /** 只读模式（如成员详情）：不响应点击，未设置时显示「未通过」而非「设置考试进度」 */
    readonly: {
      type: Boolean,
      value: false,
    },
  },

  methods: {
    onItemTap() {
      if (this.properties.readonly) return;
      this.triggerEvent('itemtap');
    },
  },
});
