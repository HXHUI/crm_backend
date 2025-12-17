import { Controller, Get } from '@nestjs/common'
import { DictionaryService } from '../modules/dictionary/dictionary.service'
import { UNQUALIFIED_REASON_OPTIONS } from './constants/unqualified-reason'
import { LOST_TYPE_OPTIONS } from './constants/lost-type'
import * as fs from 'fs'
import * as path from 'path'

@Controller('common')
export class CommonController {
  constructor(private readonly dictionaryService: DictionaryService) {}

  @Get('industries')
  async getIndustries() {
    try {
      // 从字典表获取行业数据（系统级，tenantId = null）
      const items = await this.dictionaryService.findItems(null, 'industry')
      return {
        code: 200,
        message: 'OK',
        data: items.map(item => ({
          key: item.value,
          label: item.label,
        })),
      }
    } catch (error) {
      // 如果字典表没有数据，返回空数组（兼容性处理）
      return { code: 200, message: 'OK', data: [] }
    }
  }

  @Get('sources')
  async getSources() {
    try {
      // 从字典表获取来源数据（系统级，tenantId = null）
      const items = await this.dictionaryService.findItems(null, 'lead_source')
      return {
        code: 200,
        message: 'OK',
        data: items.map(item => ({
          key: item.value,
          label: item.label,
        })),
      }
    } catch (error) {
      // 如果字典表没有数据，返回空数组（兼容性处理）
      return { code: 200, message: 'OK', data: [] }
    }
  }

  @Get('unqualified-reasons')
  getUnqualifiedReasons() {
    return { code: 200, message: 'OK', data: UNQUALIFIED_REASON_OPTIONS }
  }

  @Get('lost-types')
  getLostTypes() {
    return { code: 200, message: 'OK', data: LOST_TYPE_OPTIONS }
  }

  @Get('regions')
  getRegions() {
    try {
      const candidates = [
        path.resolve(__dirname, 'data', 'regions.json'), // dist 目录
        path.resolve(process.cwd(), 'src', 'common', 'data', 'regions.json'), // 源码目录
      ]
      let filePath = ''
      for (const p of candidates) {
        if (fs.existsSync(p)) { filePath = p; break }
      }
      if (!filePath) {
        return { code: 200, message: 'OK', data: [] }
      }
      const content = fs.readFileSync(filePath, 'utf-8')
      const raw = JSON.parse(content)

      const normalize = (input: any): any[] => {
        // 已是 {label,value,children}
        if (Array.isArray(input)) {
          if (input.length === 0) return []
          const first = input[0]
          if (first && typeof first === 'object' && 'label' in first && 'value' in first) {
            return input
          }
          // 可能是 [{ name, code, children }]
          if (first && typeof first === 'object' && 'name' in first) {
            return input.map((n: any) => ({
              label: n.name,
              value: n.name,
              children: normalize(n.children || []),
            }))
          }
        }
        // 对象映射: { 省: { 市: [区] } }
        if (input && typeof input === 'object' && !Array.isArray(input)) {
          return Object.keys(input).map((provName) => {
            const cities = input[provName]
            let cityChildren: any[] = []
            if (Array.isArray(cities)) {
              // 罕见：省 -> 区县数组（无市级）
              cityChildren = cities.map((d: any) => ({ label: d, value: d }))
            } else if (cities && typeof cities === 'object') {
              cityChildren = Object.keys(cities).map((cityName) => {
                const districts = cities[cityName] || []
                const districtChildren = Array.isArray(districts)
                  ? districts.map((d: any) => ({ label: d, value: d }))
                  : []
                return { label: cityName, value: cityName, children: districtChildren }
              })
            }
            return { label: provName, value: provName, children: cityChildren }
          })
        }
        return []
      }

      const data = normalize(raw)
      return { code: 200, message: 'OK', data }
    } catch (e) {
      return { code: 200, message: 'OK', data: [] }
    }
  }
}
