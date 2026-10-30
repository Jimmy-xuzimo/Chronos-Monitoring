using System;
using System.Linq;
using System.Windows.Forms;
class Setup{[STAThread]static void Main(string[] args){Application.EnableVisualStyles();try{App.Install(args.Contains("--silent"));}catch(Exception){MessageBox.Show("安装失败，请关闭正在运行的采集器后重试。原有采集配置保留。","我的工作台安装程序");Environment.ExitCode=1;}}}
