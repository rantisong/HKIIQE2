const BASE_URL = 'https://cdn.jsdelivr.net/npm/@material-icons/svg@1.0.33/svg';

Component({
  properties: {
    name: { type: String, value: '', observer(newVal) { this.updateSrc(newVal); } },
    size: { type: Number, value: 24 },
    colorClass: { type: String, value: 'muted' }
  },
  data: {
    iconSrc: ''
  },
  attached() {
    this.updateSrc(this.properties.name);
  },
  methods: {
    updateSrc(name) {
      if (!name) return;
      const iconName = name.replace(/-/g, '_');
      this.setData({
        iconSrc: `${BASE_URL}/${iconName}/outline.svg`
      });
    }
  }
});
